package scanner

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
)

// Match represents a single match found in the log file
type Match struct {
	LineNumber int    `json:"line"`
	Content    string `json:"content"`
	Offset     int64  `json:"offset"`
}

// SearchOptions defines the parameters for the search
type SearchOptions struct {
	FilePath   string
	Query      string
	IsRegex    bool
	IgnoreCase bool
	Invert     bool
	Logic      string // "AND" or "OR"
	Context    int    // Number of lines of context to include
	MaxResults int    // Maximum number of results to return
}

// Result represents the outcome of a search operation
type Result struct {
	Matches []Match
	Error   error
	Elapsed float64
}

// ParallelScanner handles high-performance log searching
type ParallelScanner struct {
	workerCount int
	chunkSize   int64
}

func NewParallelScanner(workers int) *ParallelScanner {
	if workers <= 0 {
		workers = 4 // Default to 4 workers
	}
	return &ParallelScanner{
		workerCount: workers,
		chunkSize:   64 * 1024 * 1024, // 64MB chunks
	}
}

// Scan performs a parallel search on the file
func (ps *ParallelScanner) Scan(ctx context.Context, opts SearchOptions, progress chan<- float64, results chan<- Match) error {
	file, err := os.Open(opts.FilePath)
	if err != nil {
		return err
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return err
	}
	fileSize := stat.Size()

	// Parse multiple queries
	queries := strings.Fields(opts.Query)
	if len(queries) == 0 {
		return nil
	}

	var res []*regexp.Regexp
	if opts.IsRegex {
		for _, q := range queries {
			pattern := q
			if opts.IgnoreCase {
				pattern = "(?i)" + pattern
			}
			re, err := regexp.Compile(pattern)
			if err != nil {
				return fmt.Errorf("invalid regex '%s': %v", q, err)
			}
			res = append(res, re)
		}
	}

	chunks := (fileSize + ps.chunkSize - 1) / ps.chunkSize
	var wg sync.WaitGroup

	semaphore := make(chan struct{}, ps.workerCount)

	var totalMatches int64
	maxResults := int64(opts.MaxResults)
	if maxResults <= 0 {
		maxResults = 100000
	}

	for i := int64(0); i < chunks; i++ {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if atomic.LoadInt64(&totalMatches) >= maxResults {
			break
		}

		wg.Add(1)
		semaphore <- struct{}{}

		go func(chunkIdx int64) {
			defer wg.Done()
			defer func() { <-semaphore }()

			start := chunkIdx * ps.chunkSize
			end := start + ps.chunkSize
			if end > fileSize {
				end = fileSize
			}

			ps.processChunk(file, start, end, opts, queries, res, results, &totalMatches, maxResults)

			if progress != nil {
				progress <- float64(chunkIdx+1) / float64(chunks) * 100
			}
		}(i)
	}

	wg.Wait()
	return nil
}

func (ps *ParallelScanner) processChunk(file *os.File, start, end int64, opts SearchOptions, queries []string, res []*regexp.Regexp, results chan<- Match, counter *int64, maxResults int64) {
	currentOffset := start
	if start > 0 {
		b := make([]byte, 1)
		file.ReadAt(b, start-1)
		if b[0] != '\n' {
			buf := make([]byte, 4096)
			for {
				n, err := file.ReadAt(buf, currentOffset)
				if err != nil && err != io.EOF {
					return
				}
				found := false
				for i := 0; i < n; i++ {
					if buf[i] == '\n' {
						currentOffset += int64(i) + 1
						found = true
						break
					}
				}
				if found || err == io.EOF || currentOffset >= end {
					break
				}
				currentOffset += int64(n)
			}
		}
	}

	if currentOffset >= end {
		return
	}

	sectionReader := io.NewSectionReader(file, currentOffset, end-currentOffset)
	scanner := bufio.NewScanner(sectionReader)
	buf := make([]byte, 0, 1024*1024)
	scanner.Buffer(buf, 10*1024*1024)

	var beforeLines []string
	afterCount := 0
	var currentMatch *Match

	// Pre-lowercase queries for optimization
	var lowerQueries []string
	if !opts.IsRegex && opts.IgnoreCase {
		for _, q := range queries {
			lowerQueries = append(lowerQueries, strings.ToLower(q))
		}
	}

	for scanner.Scan() {
		if atomic.LoadInt64(counter) >= maxResults {
			return
		}

		lineBytes := scanner.Bytes()
		matched := false

		if opts.Logic == "OR" {
			// OR logic: any term matches
			for i, q := range queries {
				if opts.IsRegex {
					if res[i].Match(lineBytes) {
						matched = true
						break
					}
				} else {
					if opts.IgnoreCase {
						if strings.Contains(strings.ToLower(string(lineBytes)), lowerQueries[i]) {
							matched = true
							break
						}
					} else {
						if strings.Contains(string(lineBytes), q) {
							matched = true
							break
						}
					}
				}
			}
		} else {
			// AND logic: all terms must match
			matched = true
			for i, q := range queries {
				termMatched := false
				if opts.IsRegex {
					if res[i].Match(lineBytes) {
						termMatched = true
					}
				} else {
					if opts.IgnoreCase {
						if strings.Contains(strings.ToLower(string(lineBytes)), lowerQueries[i]) {
							termMatched = true
						}
					} else {
						if strings.Contains(string(lineBytes), q) {
							termMatched = true
						}
					}
				}
				if !termMatched {
					matched = false
					break
				}
			}
		}

		if opts.Invert {
			matched = !matched
		}

		if matched {
			line := string(lineBytes)
			if currentMatch != nil {
				results <- *currentMatch
				atomic.AddInt64(counter, 1)
			}

			var content strings.Builder
			for _, b := range beforeLines {
				content.WriteString(b)
				content.WriteByte('\n')
			}
			content.WriteString(line)

			currentMatch = &Match{
				Content: content.String(),
				Offset:  currentOffset,
			}
			afterCount = opts.Context
			beforeLines = nil
		} else if afterCount > 0 && currentMatch != nil {
			currentMatch.Content += "\n" + string(lineBytes)
			afterCount--
			if afterCount == 0 {
				results <- *currentMatch
				atomic.AddInt64(counter, 1)
				currentMatch = nil
			}
		} else {
			if opts.Context > 0 {
				beforeLines = append(beforeLines, string(lineBytes))
				if len(beforeLines) > opts.Context {
					beforeLines = beforeLines[1:]
				}
			}
		}

		currentOffset += int64(len(lineBytes)) + 1
	}

	if currentMatch != nil && atomic.LoadInt64(counter) < maxResults {
		results <- *currentMatch
		atomic.AddInt64(counter, 1)
	}
}

func contains(s, substr string, ignoreCase bool) bool {
	if ignoreCase {
		return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
	}
	return strings.Contains(s, substr)
}
