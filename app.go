package main

import (
	"context"
	"encoding/base64"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"logana/internal/gifer"
	"logana/internal/replacer"
	"logana/internal/scanner"

	hook "github.com/robotn/gohook"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx        context.Context
	scanner    *scanner.ParallelScanner
	replacer   *replacer.Replacer
	gifer      *gifer.Gifer
	cancelFunc context.CancelFunc
	isVisible  bool
}

// NewApp creates a new App application struct
func NewApp() *App {
	userHome, _ := os.UserHomeDir()
	appConfigDir := filepath.Join(userHome, ".logana")

	return &App{
		scanner:  scanner.NewParallelScanner(runtime.NumCPU()),
		replacer: replacer.NewReplacer(appConfigDir),
		gifer:    gifer.NewGifer(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.isVisible = true
	go a.setupGlobalShortcut()
}

// setupGlobalShortcut registers Command+4 as a system-wide hotkey
func (a *App) setupGlobalShortcut() {
	// Command + 4
	hook.Register(hook.KeyDown, []string{"4", "command"}, func(e hook.Event) {
		a.ToggleWindow()
	})

	s := hook.Start()
	<-hook.Process(s)
}

// ToggleWindow shows or hides the main window
func (a *App) ToggleWindow() {
	if a.isVisible {
		wailsruntime.WindowHide(a.ctx)
		a.isVisible = false
	} else {
		wailsruntime.WindowShow(a.ctx)
		wailsruntime.WindowUnminimise(a.ctx)
		wailsruntime.WindowCenter(a.ctx)
		a.isVisible = true
	}
}

// CancelSearch stops the current search operation
func (a *App) CancelSearch() {
	if a.cancelFunc != nil {
		a.cancelFunc()
		a.cancelFunc = nil
	}
}

// SelectFile opens a file dialog to select a log file
func (a *App) SelectFile() (string, error) {
	selection, err := wailsruntime.OpenFileDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title: "Select Log File",
		Filters: []wailsruntime.FileFilter{
			{DisplayName: "Log Files (*.log, *.out, *.txt)", Pattern: "*.log;*.out;*.txt"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return "", err
	}
	return selection, nil
}

// Search starts a log search operation
func (a *App) Search(opts scanner.SearchOptions) error {
	a.CancelSearch() // Cancel any existing search

	startTime := time.Now()

	progressChan := make(chan float64, 10)
	resultsChan := make(chan scanner.Match, 100)

	searchCtx, cancel := context.WithCancel(a.ctx)
	a.cancelFunc = cancel
	defer func() {
		cancel()
		a.cancelFunc = nil
	}()

	// Handle progress updates
	go func() {
		for p := range progressChan {
			select {
			case <-searchCtx.Done():
				return
			default:
				wailsruntime.EventsEmit(a.ctx, "search_progress", p)
			}
		}
	}()

	// Handle results
	go func() {
		batchSize := 50
		var batch []scanner.Match
		for {
			select {
			case <-searchCtx.Done():
				if len(batch) > 0 {
					wailsruntime.EventsEmit(a.ctx, "search_results", batch)
				}
				return
			case match, ok := <-resultsChan:
				if !ok {
					if len(batch) > 0 {
						wailsruntime.EventsEmit(a.ctx, "search_results", batch)
					}
					return
				}
				batch = append(batch, match)
				if len(batch) >= batchSize {
					wailsruntime.EventsEmit(a.ctx, "search_results", batch)
					batch = nil
				}
			}
		}
	}()

	err := a.scanner.Scan(searchCtx, opts, progressChan, resultsChan)

	close(progressChan)
	close(resultsChan)

	elapsed := time.Since(startTime).Seconds()

	status := "complete"
	if err != nil {
		if err == context.Canceled {
			status = "cancelled"
		} else {
			status = "error"
		}
	}

	wailsruntime.EventsEmit(a.ctx, "search_complete", map[string]interface{}{
		"status": status,
		"error": func() string {
			if err != nil {
				return err.Error()
			}
			return ""
		}(),
		"elapsed": elapsed,
	})

	return err
}

// GetFileInfo returns basic information about a file
func (a *App) GetFileInfo(filePath string) (map[string]interface{}, error) {
	file, err := os.Stat(filePath)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"size": file.Size(),
		"name": file.Name(),
	}, nil
}

// ReplaceText performs multiple regex replacements
func (a *App) ReplaceText(text string, rules []replacer.Rule) (string, error) {
	return a.replacer.Replace(text, rules)
}

// SaveRuleSets saves rule sets to disk
func (a *App) SaveRuleSets(ruleSets []replacer.RuleSet) error {
	return a.replacer.SaveRuleSets(ruleSets)
}

// LoadRuleSets loads rule sets from disk
func (a *App) LoadRuleSets() ([]replacer.RuleSet, error) {
	return a.replacer.LoadRuleSets()
}

// ConvertVideoToGif converts video to gif with progress updates
func (a *App) ConvertVideoToGif(opts gifer.GiferOptions) error {
	progressChan := make(chan float64, 10)

	// Create a new context for the conversion
	convertCtx, cancel := context.WithCancel(a.ctx)
	defer cancel()

	// Handle progress updates
	go func() {
		for p := range progressChan {
			select {
			case <-convertCtx.Done():
				return
			default:
				wailsruntime.EventsEmit(a.ctx, "gifer_progress", p)
			}
		}
	}()

	err := a.gifer.Convert(convertCtx, opts, progressChan)
	close(progressChan)

	if err != nil {
		wailsruntime.EventsEmit(a.ctx, "gifer_error", err.Error())
		return err
	}

	wailsruntime.EventsEmit(a.ctx, "gifer_complete", opts.OutputPath)
	return nil
}

// CheckFFmpeg checks if ffmpeg is available
func (a *App) CheckFFmpeg() bool {
	return a.gifer.CheckFFmpeg()
}

// SelectVideoFile opens a file dialog to select a video file
func (a *App) SelectVideoFile() (string, error) {
	selection, err := wailsruntime.OpenFileDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title: "Select Video File",
		Filters: []wailsruntime.FileFilter{
			{DisplayName: "Video Files (*.mp4, *.mov, *.avi, *.mkv)", Pattern: "*.mp4;*.mov;*.avi;*.mkv"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
	return selection, err
}

// GetFileBase64 reads a file and returns its base64 content
func (a *App) GetFileBase64(filePath string) (string, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(data), nil
}

// SelectSaveGifPath opens a file dialog to select where to save the GIF
func (a *App) SelectSaveGifPath(defaultName string) (string, error) {
	selection, err := wailsruntime.SaveFileDialog(a.ctx, wailsruntime.SaveDialogOptions{
		Title:           "Save GIF",
		DefaultFilename: defaultName,
		Filters: []wailsruntime.FileFilter{
			{DisplayName: "GIF Files (*.gif)", Pattern: "*.gif"},
		},
	})
	return selection, err
}
