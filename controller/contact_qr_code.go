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
package controller

import (
	"bytes"
	"io"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

const maxContactQRCodeSize = 1024 * 1024

func UploadContactQRCode(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxContactQRCodeSize+32*1024)
	fileHeader, err := c.FormFile("file")
	if err != nil {
		common.ApiErrorMsg(c, "invalid QR code image")
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		common.ApiErrorMsg(c, "unable to read QR code image")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, maxContactQRCodeSize+1))
	if err != nil {
		common.ApiErrorMsg(c, "unable to read QR code image")
		return
	}
	if len(data) > maxContactQRCodeSize {
		common.ApiErrorMsg(c, "QR code image must be 1 MB or smaller")
		return
	}
	contentType, ok := contactQRCodeContentType(data)
	if !ok {
		common.ApiErrorMsg(c, "QR code image must be a PNG, JPEG, or WebP image")
		return
	}

	assetID, err := model.CreateContactQRCodeAsset(contentType, data)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"url": "/api/contact/qr-code/" + assetID})
}

func GetContactQRCode(c *gin.Context) {
	assetID := c.Param("id")
	if len(assetID) != 32 || strings.Trim(assetID, "0123456789abcdefABCDEF") != "" {
		c.Status(http.StatusNotFound)
		return
	}
	contentType, data, err := model.GetContactQRCodeAsset(assetID)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.Header("X-Content-Type-Options", "nosniff")
	c.Data(http.StatusOK, contentType, data)
}

func contactQRCodeContentType(data []byte) (string, bool) {
	switch {
	case len(data) >= 8 && bytes.Equal(data[:8], []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}):
		return "image/png", true
	case len(data) >= 3 && bytes.Equal(data[:3], []byte{0xff, 0xd8, 0xff}):
		return "image/jpeg", true
	case len(data) >= 12 && bytes.Equal(data[:4], []byte("RIFF")) && bytes.Equal(data[8:12], []byte("WEBP")):
		return "image/webp", true
	default:
		return "", false
	}
}
