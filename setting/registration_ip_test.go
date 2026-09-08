package setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRegistrationIPBlacklistMatchesAddressesAndNetworks(t *testing.T) {
	require.NoError(t, UpdateRegistrationIPBlacklist("203.0.113.10\n198.51.100.0/24\n2001:db8::/32"))
	SetRegistrationIPBlacklistEnabled(true)
	t.Cleanup(func() {
		SetRegistrationIPBlacklistEnabled(false)
		require.NoError(t, UpdateRegistrationIPBlacklist(""))
	})

	assert.True(t, IsRegistrationIPBlocked("203.0.113.10"))
	assert.True(t, IsRegistrationIPBlocked("198.51.100.42"))
	assert.True(t, IsRegistrationIPBlocked("2001:db8::42"))
	assert.False(t, IsRegistrationIPBlocked("203.0.113.11"))
	assert.False(t, IsRegistrationIPBlocked("not-an-ip"))
}

func TestRegistrationIPBlacklistDisabledDoesNotBlock(t *testing.T) {
	require.NoError(t, UpdateRegistrationIPBlacklist("203.0.113.10"))
	SetRegistrationIPBlacklistEnabled(false)
	t.Cleanup(func() { require.NoError(t, UpdateRegistrationIPBlacklist("")) })

	assert.False(t, IsRegistrationIPBlocked("203.0.113.10"))
}

func TestValidateRegistrationIPBlacklistReportsInvalidLine(t *testing.T) {
	err := ValidateRegistrationIPBlacklist("203.0.113.10\ninvalid-entry")

	require.Error(t, err)
	assert.Equal(t, "invalid IP address or CIDR on line 2", err.Error())
}
