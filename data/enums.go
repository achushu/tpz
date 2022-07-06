package data

import (
	"bytes"
	"strconv"
)

/*
 * ENUMERATIONS
 */
// NOTE: These enumerations must follow the order they are inserted into their
//       respective tables

type Experience int

const (
	Beginner Experience = iota
	Intermediate
	Advanced
)

var AllExperiences = []Experience{Beginner, Intermediate, Advanced}

func (t Experience) String() string {
	switch t {
	case Beginner:
		return "beginner"
	case Intermediate:
		return "intermediate"
	case Advanced:
		return "advanced"
	}
	return "Experience(" + strconv.Itoa(int(t)) + ")"
}

func (t Experience) StringShort() string {
	switch t {
	case Beginner:
		return "beg"
	case Intermediate:
		return "int"
	case Advanced:
		return "adv"
	}
	return t.String()
}

type AgeGroup int

const (
	Child AgeGroup = iota
	Youth
	GroupC
	GroupB
	GroupA
	Adult
	AdultII
)

var AllAgeGroups = []AgeGroup{Child, Youth, GroupC, GroupB, GroupA, Adult, AdultII}

func (t AgeGroup) String() string {
	switch t {
	case Child:
		return "Child"
	case Youth:
		return "Youth"
	case GroupC:
		return "Group C"
	case GroupB:
		return "Group B"
	case GroupA:
		return "Group A"
	case Adult:
		return "Adult"
	case AdultII:
		return "Adult II"
	}
	return "Age Group(" + strconv.Itoa(int(t)) + ")"
}

type Gender int

const (
	Female Gender = iota
	Male
)

var AllGenders = []Gender{Female, Male}

func (t Gender) String() string {
	switch t {
	case Female:
		return "female"
	case Male:
		return "male"
	}
	return "Gender(" + strconv.Itoa(int(t)) + ")"
}

func (t Gender) StringShort() string {
	switch t {
	case Female:
		return "F"
	case Male:
		return "M"
	}
	return t.String()
}

type Ruleset int

const (
	USWU Ruleset = iota
)

var AllRulesets = []Ruleset{USWU}

func (t Ruleset) String() string {
	switch t {
	case USWU:
		return "uswu"
	}
	return "Ruleset(" + strconv.Itoa(int(t)) + ")"
}

type Style int
type Category int

const (
	Changquan Style = iota
	Daoshu
	Jianshu
	Gunshu
	Qiangshu
	Nanquan
	Nandao
	Nangun
	Taijiquan
	Taijijian
)

var AllStyles = []Style{Changquan, Daoshu, Jianshu, Gunshu, Qiangshu, Nanquan, Nandao, Nangun, Taijiquan, Taijijian}

const (
	Northern Category = iota
	Southern
	Taiji
)

func (t Style) String() string {
	switch t {
	case Changquan:
		return "Changquan"
	case Daoshu:
		return "Daoshu"
	case Jianshu:
		return "Jianshu"
	case Gunshu:
		return "Gunshu"
	case Qiangshu:
		return "Qiangshu"
	case Nanquan:
		return "Nanquan"
	case Nandao:
		return "Nandao"
	case Nangun:
		return "Nangun"
	case Taijiquan:
		return "Taijiquan"
	case Taijijian:
		return "Taijijian"
	}
	return "Style(" + strconv.Itoa(int(t)) + ")"
}

func (t Style) StringShort() string {
	switch t {
	case Changquan:
		return "CQ"
	case Daoshu:
		return "DS"
	case Jianshu:
		return "JS"
	case Gunshu:
		return "GS"
	case Qiangshu:
		return "QS"
	case Nanquan:
		return "NQ"
	case Nandao:
		return "ND"
	case Nangun:
		return "NG"
	case Taijiquan:
		return "TQ"
	case Taijijian:
		return "TJ"
	}
	return t.String()
}

func (t Style) Category() Category {
	switch t {
	case Nanquan:
		fallthrough
	case Nandao:
		fallthrough
	case Nangun:
		return Southern
	case Taijiquan:
		fallthrough
	case Taijijian:
		return Taiji
	default:
		return Northern
	}
}

func (t Style) MarshalJSON() ([]byte, error) {
	buffer := bytes.NewBufferString(`"`)
	buffer.WriteString(t.String())
	buffer.WriteString(`"`)
	return buffer.Bytes(), nil
}
