package errors

import (
	"errors"
	"fmt"
)

var (
	ErrNotEnabled = NewDatabaseError("database not enabled", nil)
	// ErrNotFound indicates no results were found in the database
	ErrNotFound       = NewDatabaseError("not found", nil)
	ErrNotImplemented = errors.New("not implemented")
)

type DatabaseError struct {
	message string
	err     error
}

func NewDatabaseError(msg string, err error) DatabaseError {
	return DatabaseError{msg, err}
}

func (e DatabaseError) Error() string {
	return e.message + e.err.Error()
}

func AuthenticationError(err error) DatabaseError {
	return NewDatabaseError("authentication failed: ", err)
}

func ConnectionError(err error) DatabaseError {
	return NewDatabaseError("connection error: ", err)
}

type EventError struct {
	eventID int
}

func NewEventError(eventID int) EventError {
	return EventError{eventID}
}

func (e EventError) Error() string {
	return fmt.Sprintf("could not find event ID %d", e.eventID)
}

type RingError struct {
	ringID int
}

func NewRingError(ringID int) RingError {
	return RingError{ringID}
}

func (e RingError) Error() string {
	return fmt.Sprintf("no such ring (%d)", e.ringID)
}

type TypeCastError struct {
	varName  string
	typeName string
}

func NewTypeCastError(varName, typeName string) TypeCastError {
	return TypeCastError{varName, typeName}
}

func (e TypeCastError) Error() string {
	return fmt.Sprintf("could not cast '%s' as %s", e.varName, e.typeName)
}
