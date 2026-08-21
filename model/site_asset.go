/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
package model

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"gorm.io/gorm"
)

const contactQRCodeChunkSize = 16 * 1024

type SiteAsset struct {
	ID          string `gorm:"primaryKey;size:64"`
	ContentType string `gorm:"size:32;not null"`
	Size        int    `gorm:"not null"`
}

type SiteAssetChunk struct {
	AssetID    string `gorm:"primaryKey;size:64"`
	ChunkIndex int    `gorm:"primaryKey"`
	Data       []byte `gorm:"not null"`
}

func CreateContactQRCodeAsset(contentType string, data []byte) (string, error) {
	assetIDBytes := make([]byte, 16)
	if _, err := rand.Read(assetIDBytes); err != nil {
		return "", err
	}
	assetID := hex.EncodeToString(assetIDBytes)

	err := DB.Transaction(func(tx *gorm.DB) error {
		asset := SiteAsset{
			ID:          assetID,
			ContentType: contentType,
			Size:        len(data),
		}
		if err := tx.Create(&asset).Error; err != nil {
			return err
		}
		for offset, chunkIndex := 0, 0; offset < len(data); offset, chunkIndex = offset+contactQRCodeChunkSize, chunkIndex+1 {
			end := offset + contactQRCodeChunkSize
			if end > len(data) {
				end = len(data)
			}
			chunk := SiteAssetChunk{
				AssetID:    assetID,
				ChunkIndex: chunkIndex,
				Data:       data[offset:end],
			}
			if err := tx.Create(&chunk).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return "", err
	}
	return assetID, nil
}

func GetContactQRCodeAsset(assetID string) (string, []byte, error) {
	var asset SiteAsset
	if err := DB.First(&asset, "id = ?", assetID).Error; err != nil {
		return "", nil, err
	}

	var chunks []SiteAssetChunk
	if err := DB.Where("asset_id = ?", assetID).Order("chunk_index ASC").Find(&chunks).Error; err != nil {
		return "", nil, err
	}
	data := make([]byte, 0, asset.Size)
	for _, chunk := range chunks {
		data = append(data, chunk.Data...)
	}
	if len(data) != asset.Size {
		return "", nil, fmt.Errorf("incomplete site asset")
	}
	return asset.ContentType, data, nil
}
