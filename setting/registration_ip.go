package setting

import (
	"fmt"
	"net/netip"
	"strings"
	"sync"
)

const (
	RegistrationIPBlacklistEnabledKey = "RegistrationIPBlacklistEnabled"
	RegistrationIPBlacklistKey        = "RegistrationIPBlacklist"
)

var registrationIPBlacklist = struct {
	sync.RWMutex
	enabled  bool
	prefixes []netip.Prefix
}{}

type RegistrationIPBlacklistEntryError struct {
	Line int
}

func (err *RegistrationIPBlacklistEntryError) Error() string {
	return fmt.Sprintf("invalid IP address or CIDR on line %d", err.Line)
}

func SetRegistrationIPBlacklistEnabled(enabled bool) {
	registrationIPBlacklist.Lock()
	registrationIPBlacklist.enabled = enabled
	registrationIPBlacklist.Unlock()
}

func ValidateRegistrationIPBlacklist(value string) error {
	_, err := parseRegistrationIPBlacklist(value)
	return err
}

func UpdateRegistrationIPBlacklist(value string) error {
	prefixes, err := parseRegistrationIPBlacklist(value)
	if err != nil {
		return err
	}
	registrationIPBlacklist.Lock()
	registrationIPBlacklist.prefixes = prefixes
	registrationIPBlacklist.Unlock()
	return nil
}

func IsRegistrationIPBlocked(value string) bool {
	address, err := netip.ParseAddr(strings.TrimSpace(value))
	if err != nil {
		return false
	}
	address = address.Unmap()

	registrationIPBlacklist.RLock()
	defer registrationIPBlacklist.RUnlock()
	if !registrationIPBlacklist.enabled {
		return false
	}
	for _, prefix := range registrationIPBlacklist.prefixes {
		if prefix.Contains(address) {
			return true
		}
	}
	return false
}

func parseRegistrationIPBlacklist(value string) ([]netip.Prefix, error) {
	lines := strings.Split(strings.ReplaceAll(value, "\r\n", "\n"), "\n")
	prefixes := make([]netip.Prefix, 0, len(lines))
	for index, line := range lines {
		entry := strings.TrimSpace(line)
		if entry == "" {
			continue
		}

		prefix, err := netip.ParsePrefix(entry)
		if err != nil {
			address, addressErr := netip.ParseAddr(entry)
			if addressErr != nil || address.Zone() != "" {
				return nil, &RegistrationIPBlacklistEntryError{Line: index + 1}
			}
			address = address.Unmap()
			prefix = netip.PrefixFrom(address, address.BitLen())
		} else {
			if prefix.Addr().Zone() != "" {
				return nil, &RegistrationIPBlacklistEntryError{Line: index + 1}
			}
			prefix = prefix.Masked()
		}
		prefixes = append(prefixes, prefix)
	}
	return prefixes, nil
}
