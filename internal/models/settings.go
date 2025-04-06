package models

import "github.com/5tuartw/droplet/internal/database"

type UserSettingsPreferences struct {
	ColorTheme string `json:"color_theme"`
	LayoutPref string `json:"layout_pref"`
}

type AllUserSettingsResponse struct {
	Preferences   UserSettingsPreferences `json:"preferences"`
	Subscriptions []database.TargetInfo   `json:"subscriptions"`
}

