package database

func MapSubscriptionsRowsToInfo(rows []GetSubscriptionsForUserRow) []TargetInfo {
	if len(rows) == 0 {
		return []TargetInfo{}
	}

	infos := make([]TargetInfo, 0, len(rows))

	for _, row := range rows {
		targetTypeStr := string(row.TargetType)
		targetIDValue := row.TargetID
		targetNameStr := row.TargetName

		info := TargetInfo{
			Type: targetTypeStr,
			ID:   targetIDValue,
			Name: targetNameStr,
		}

		infos = append(infos, info)
	}

	return infos
}
