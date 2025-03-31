package helpers

import "database/sql"

func StringFromNullString(ns sql.NullString) string {
	if ns.Valid {
		return ns.String
	}
	return "" // Or a default value of your choice
}

func NullStringFromString(s string) sql.NullString {
	if s != "" {
		return sql.NullString{
			String: s,
			Valid:  true,
		}
	}
	return sql.NullString{
		String: "", // The value doesn't really matter when Valid is false
		Valid:  false,
	}
}
