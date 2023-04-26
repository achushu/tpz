package auth

import (
	"crypto/sha512"
	"golang.org/x/crypto/bcrypt"

	"github.com/achushu/tpz/data"
	"github.com/achushu/tpz/errors"
)

var (
	// TEMPORARY
	// TODO: Implement session saving and caching on data component
	sessionCache = make(map[string]*data.Session)
)

// hashPassword provides a middle step to guarantee entropy
// while preventing DoS from excessively long strings.
// Every plaintext password must be hashed first.
func hashPassword(password string) []byte {
	hash := sha512.Sum512([]byte(password))
	return hash[:]
}

// CreateUser saves a new user with the given password.
// The user's password is processed by SHA-512 then bcrypt.
func CreateUser(username, password string) error {
	storedPass, err := bcrypt.GenerateFromPassword(hashPassword(password), 10)
	if err != nil {
		return err
	}
	return data.CreateUser(username, storedPass)
}

// UserLogin validates user credentials
func UserLogin(username, password string) (*data.User, error) {
	// login with username
	u, err := data.GetUser(username)
	if err == errors.ErrNotFound {
		// don't expose that user doesn't exist
		// a bad password and an incorrect username should look the same
		return nil, errors.ErrUserLogonFailure
	}
	if err != nil {
		return nil, err
	}
	err = validate(u, password)
	if err != nil {
		return nil, err
	}
	return u, nil
}

// Validate provided password against user's stored hash
func validate(u *data.User, password string) error {
	// hash password and compare
	hashPass := hashPassword(password)

	err := bcrypt.CompareHashAndPassword(u.Password, hashPass)
	if err != nil {
		if err == bcrypt.ErrMismatchedHashAndPassword {
			return errors.ErrUserLogonFailure
		}
		return err
	}
	return nil
}
