package app

import (
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestEncryptPassword(t *testing.T) {
	pw := "password"
	hash, _ := bcrypt.GenerateFromPassword(hashPassword(pw), 10)
	t.Logf("%s", hash)
}
