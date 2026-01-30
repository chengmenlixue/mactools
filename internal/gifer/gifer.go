package gifer

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strconv"
)

// GiferOptions defines the parameters for video to gif conversion
type GiferOptions struct {
	InputPath  string `json:"inputPath"`
	OutputPath string `json:"outputPath"`
	FPS        int    `json:"fps"`
	Loop       bool   `json:"loop"`
	Width      int    `json:"width"`   // 0 for original/auto
	Quality    int    `json:"quality"` // 1-100, 100 is best quality
}

// Gifer handles video to gif conversion using ffmpeg
type Gifer struct {
	ffmpegPath string
}

func NewGifer() *Gifer {
	g := &Gifer{}
	g.resolveFFmpegPath()
	return g
}

// resolveFFmpegPath tries to find the absolute path of ffmpeg
func (g *Gifer) resolveFFmpegPath() string {
	if g.ffmpegPath != "" {
		return g.ffmpegPath
	}

	// 1. Try system PATH
	path, err := exec.LookPath("ffmpeg")
	if err == nil {
		g.ffmpegPath = path
		return path
	}

	// 2. Try common macOS installation paths
	commonPaths := []string{
		"/opt/homebrew/bin/ffmpeg", // Apple Silicon
		"/usr/local/bin/ffmpeg",    // Intel / Manual
		"/usr/bin/ffmpeg",          // System
	}

	for _, p := range commonPaths {
		if _, err := os.Stat(p); err == nil {
			g.ffmpegPath = p
			return p
		}
	}

	return ""
}

// CheckFFmpeg checks if ffmpeg is installed
func (g *Gifer) CheckFFmpeg() bool {
	return g.resolveFFmpegPath() != ""
}

// Convert converts video to gif with high quality optimization
func (g *Gifer) Convert(ctx context.Context, opts GiferOptions, progress chan<- float64) error {
	ffmpeg := g.resolveFFmpegPath()
	if ffmpeg == "" {
		return fmt.Errorf("ffmpeg not found in system PATH or common macOS locations (/opt/homebrew/bin, /usr/local/bin)")
	}

	// Algorithm: Use two-pass palette generation for highest quality
	// 1. Generate a custom palette for the video
	// 2. Use that palette to generate the GIF

	loopVal := -1 // No loop
	if opts.Loop {
		loopVal = 0 // Infinite loop
	}

	fpsStr := strconv.Itoa(opts.FPS)
	scaleStr := "scale=trunc(iw/2)*2:-2" // Ensure even dimensions for compatibility
	if opts.Width > 0 {
		scaleStr = fmt.Sprintf("scale=%d:-2", opts.Width)
	}

	// Compression settings based on quality (1-100)
	// Higher quality = more colors, better dithering
	maxColors := 256
	dither := "sierra2_4a"
	if opts.Quality < 30 {
		maxColors = 64
		dither = "bayer:bayer_scale=3"
	} else if opts.Quality < 70 {
		maxColors = 128
		dither = "bayer:bayer_scale=1"
	}

	// Filter string for optimized GIF
	filter := fmt.Sprintf("fps=%s,%s:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=%d:reserve_transparent=0[p];[s1][p]paletteuse=dither=%s",
		fpsStr, scaleStr, maxColors, dither)

	args := []string{
		"-hwaccel", "videotoolbox", // Use macOS Hardware Acceleration for decoding
		"-threads", "0", // Use all available CPU cores
		"-y", // Overwrite output
		"-i", opts.InputPath,
		"-vf", filter,
		"-loop", strconv.Itoa(loopVal),
		opts.OutputPath,
	}

	cmd := exec.CommandContext(ctx, ffmpeg, args...)

	// Capture stderr for progress parsing
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		return err
	}

	// Parse duration and time from ffmpeg output to calculate progress
	go func() {
		scanner := bufio.NewScanner(stderr)
		duration := 0.0
		durationRegex := regexp.MustCompile(`Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})`)
		timeRegex := regexp.MustCompile(`time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})`)

		for scanner.Scan() {
			line := scanner.Text()

			// Extract duration
			if duration == 0 {
				matches := durationRegex.FindStringSubmatch(line)
				if len(matches) == 5 {
					h, _ := strconv.ParseFloat(matches[1], 64)
					m, _ := strconv.ParseFloat(matches[2], 64)
					s, _ := strconv.ParseFloat(matches[3], 64)
					ms, _ := strconv.ParseFloat(matches[4], 64)
					duration = h*3600 + m*60 + s + ms/100
				}
			}

			// Extract current time and update progress
			if duration > 0 {
				matches := timeRegex.FindStringSubmatch(line)
				if len(matches) == 5 {
					h, _ := strconv.ParseFloat(matches[1], 64)
					m, _ := strconv.ParseFloat(matches[2], 64)
					s, _ := strconv.ParseFloat(matches[3], 64)
					ms, _ := strconv.ParseFloat(matches[4], 64)
					currentTime := h*3600 + m*60 + s + ms/100

					p := (currentTime / duration) * 100
					if p > 100 {
						p = 100
					}
					progress <- p
				}
			}
		}
	}()

	return cmd.Wait()
}
