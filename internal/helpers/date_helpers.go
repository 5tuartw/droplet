package helpers

import (
	"fmt"
	"time"
)

const dateLayout = "2006-01-02"

func ParsePostDate(dateStrPtr *string) (time.Time, error) {
	if dateStrPtr == nil || *dateStrPtr == "" {
		return time.Now(), nil
	}

	t, err := time.Parse(dateLayout, *dateStrPtr)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid post_date format '%s': %w. Use YYYY-MM-DD", *dateStrPtr, err)
	}
	year, month, day := t.Date() //setting time to start of day
	return time.Date(year, month, day, 0, 0, 0, 0, t.Location()), nil
}

func ParseExpireDate(dateStrPtr *string) (time.Time, error) {
	if dateStrPtr == nil || *dateStrPtr == "" {
		t := time.Now().AddDate(1, 0, 0)
		year, month, day := t.Date()
		return time.Date(year, month, day, 23, 59, 59, 999999999, t.Location()), nil
	}

	t, err := time.Parse(dateLayout, *dateStrPtr)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid expire_date format '%s': %w. Use YYYY-MM-DD", *dateStrPtr, err)
	}
	year, month, day := t.Date() //setting time to start of day
	return time.Date(year, month, day, 23, 59, 59, 999999999, t.Location()), nil
}
