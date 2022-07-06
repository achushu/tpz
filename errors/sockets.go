package errors

import (
	"strconv"
	"strings"
)

type BroadcastError struct {
	ringID int
	errs   []error
}

func NewBroadcastError(ringID int) BroadcastError {
	return BroadcastError{
		ringID: ringID,
		errs:   make([]error, 0),
	}
}

func (e BroadcastError) AddError(err error) {
	e.errs = append(e.errs, err)
}

func (e BroadcastError) Error() string {
	if len(e.errs) == 0 {
		return "no broadcast errors occurred"
	}
	var s strings.Builder
	s.WriteString("error(s) broadcasting to ring " + strconv.Itoa(e.ringID) + ":\n")
	for i := 0; i < len(e.errs); i++ {
		s.WriteString("\t" + e.errs[i].Error() + "\n")
	}
	return s.String()
}

func (e BroadcastError) Errors() int {
	return len(e.errs)
}
