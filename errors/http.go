package errors

import (
	"fmt"
	"net/http"
)

type HttpError struct {
	Code    int
	Message string
	Err     error
}

func NewBadRequest(err error) HttpError {
	return HttpError{http.StatusBadRequest, "bad request", err}
}
func NewForbiddenError() HttpError {
	return HttpError{Code: http.StatusForbidden, Message: "forbidden"}
}
func NewInternalError(err error) HttpError {
	return HttpError{http.StatusInternalServerError, "internal server error", err}
}

func NewNotFoundError() HttpError {
	return HttpError{Code: http.StatusNotFound, Message: "not found"}
}

func (e HttpError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%d %s: %s", e.Code, e.Message, e.Err)
	} else {
		return fmt.Sprintf("%d %s", e.Code, e.Message)
	}
}
