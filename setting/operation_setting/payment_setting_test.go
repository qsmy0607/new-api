package operation_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetPaymentDiscount(t *testing.T) {
	original := paymentSetting.AmountDiscount
	t.Cleanup(func() {
		paymentSetting.AmountDiscount = original
	})

	t.Run("uniform configured discounts apply globally", func(t *testing.T) {
		paymentSetting.AmountDiscount = map[int]float64{40: 0.5, 200: 0.5, 1000: 0.5}

		discount, ok := GetGlobalPaymentDiscount()
		require.True(t, ok)
		assert.Equal(t, 0.5, discount)
		assert.Equal(t, 0.5, GetPaymentDiscount(100))
	})

	t.Run("different discounts retain exact amount behavior", func(t *testing.T) {
		paymentSetting.AmountDiscount = map[int]float64{100: 0.8, 200: 0.5}

		_, ok := GetGlobalPaymentDiscount()
		assert.False(t, ok)
		assert.Equal(t, 0.8, GetPaymentDiscount(100))
		assert.Equal(t, float64(1), GetPaymentDiscount(150))
	})

	t.Run("invalid discounts do not become global", func(t *testing.T) {
		paymentSetting.AmountDiscount = map[int]float64{100: 0, 200: 2}

		_, ok := GetGlobalPaymentDiscount()
		assert.False(t, ok)
		assert.Equal(t, float64(1), GetPaymentDiscount(100))
	})
}
