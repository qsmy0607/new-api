package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeExactIPsDeduplicatesAndUnmapsAddresses(t *testing.T) {
	ips, err := normalizeExactIPs([]string{
		" 203.0.113.10 ",
		"203.0.113.10",
		"::ffff:203.0.113.10",
		"2001:db8::1",
	})
	require.NoError(t, err)
	assert.Equal(t, []string{"2001:db8::1", "203.0.113.10"}, ips)
}

func TestNormalizeExactIPsRejectsCIDR(t *testing.T) {
	_, err := normalizeExactIPs([]string{"203.0.113.0/24"})
	require.Error(t, err)
}
