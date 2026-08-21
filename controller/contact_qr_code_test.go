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
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestContactQRCodeContentTypeRecognizesSupportedImageHeaders(t *testing.T) {
	tests := []struct {
		name        string
		data        []byte
		contentType string
		valid       bool
	}{
		{
			name:        "png",
			data:        []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'},
			contentType: "image/png",
			valid:       true,
		},
		{
			name:        "jpeg",
			data:        []byte{0xff, 0xd8, 0xff},
			contentType: "image/jpeg",
			valid:       true,
		},
		{
			name:        "webp",
			data:        []byte("RIFF\x00\x00\x00\x00WEBP"),
			contentType: "image/webp",
			valid:       true,
		},
		{
			name:  "unsupported",
			data:  []byte("not an image"),
			valid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			contentType, valid := contactQRCodeContentType(tt.data)
			assert.Equal(t, tt.valid, valid)
			assert.Equal(t, tt.contentType, contentType)
		})
	}
}
