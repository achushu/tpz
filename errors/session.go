package errors

import "errors"

var (
	// ErrSessionInvalid indicates that the session could not be retreived
	ErrSessionInvalid = errors.New("invalid session")
	// ErrUserLogonFailure indicates an invalid user and/or password
	ErrUserLogonFailure = errors.New("invalid credentials")
)
