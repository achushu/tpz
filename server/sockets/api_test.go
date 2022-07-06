package sockets

import "testing"

func TestActionEnum(t *testing.T) {
	a := "init"
	expected := ClientInit
	res, err := ToAction(a)
	if err != nil {
		t.Errorf("error converting string to action: %s\n", err)
	}
	if res != expected {
		t.Errorf("want: %s; got: %s\n", expected.String(), res.String())
	}

	res, err = ToAction("something-very-invalid")
	if err == nil {
		t.Error("error should have occurred for an invalid action; instead got", res.String())
	}
}
