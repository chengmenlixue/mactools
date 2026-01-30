package replacer

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
)

// Rule defines a single replacement rule
type Rule struct {
	Name        string `json:"name"`
	Pattern     string `json:"pattern"`
	Replacement string `json:"replacement"`
	Active      bool   `json:"active"`
	DotAll      bool   `json:"dotAll"`    // Enable (?s) flag: . matches \n
	Collapsed   bool   `json:"collapsed"` // UI state: whether the rule is collapsed in sidebar
}

// RuleSet defines a named set of rules
type RuleSet struct {
	Name  string `json:"name"`
	Rules []Rule `json:"rules"`
}

// Replacer handles the replacement logic
type Replacer struct {
	configPath string
}

func NewReplacer(appConfigDir string) *Replacer {
	configPath := filepath.Join(appConfigDir, "regex_rules.json")
	return &Replacer{
		configPath: configPath,
	}
}

// Replace performs multiple regex replacements on the input text
func (r *Replacer) Replace(text string, rules []Rule) (string, error) {
	result := text
	for _, rule := range rules {
		if !rule.Active {
			continue
		}
		pattern := rule.Pattern
		if rule.DotAll {
			pattern = "(?s)" + pattern
		}
		re, err := regexp.Compile(pattern)
		if err != nil {
			return "", fmt.Errorf("invalid regex pattern '%s': %v", rule.Pattern, err)
		}
		result = re.ReplaceAllString(result, rule.Replacement)
	}
	return result, nil
}

// SaveRuleSets saves all rule sets to a local file
func (r *Replacer) SaveRuleSets(ruleSets []RuleSet) error {
	dir := filepath.Dir(r.configPath)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}

	data, err := json.MarshalIndent(ruleSets, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(r.configPath, data, 0o644)
}

// LoadRuleSets loads all rule sets from the local file
func (r *Replacer) LoadRuleSets() ([]RuleSet, error) {
	if _, err := os.Stat(r.configPath); os.IsNotExist(err) {
		return []RuleSet{}, nil
	}

	data, err := os.ReadFile(r.configPath)
	if err != nil {
		return nil, err
	}

	var ruleSets []RuleSet
	if err := json.Unmarshal(data, &ruleSets); err != nil {
		return nil, err
	}

	return ruleSets, nil
}
