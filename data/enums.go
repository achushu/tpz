package data

import (
	"bytes"
	"strconv"
	"strings"
)

/*
 * ENUMERATIONS
 */

type Experience int

const (
	InvalidExperience Experience = iota
	Beginner
	Intermediate
	Advanced
	FirstTimer
)

var AllExperiences = []Experience{Beginner, Intermediate, Advanced, FirstTimer}

func (t Experience) String() string {
	switch t {
	case Beginner:
		return "beginner"
	case Intermediate:
		return "intermediate"
	case Advanced:
		return "advanced"
	case FirstTimer:
		return "firsttimer"
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
	case FirstTimer:
		return "ft"
	}
	return t.String()
}

func ToExperience(s string) Experience {
	switch strings.ToLower(s) {
	case FirstTimer.String():
		fallthrough
	case FirstTimer.StringShort():
		return FirstTimer
	case Beginner.String():
		fallthrough
	case Beginner.StringShort():
		return Beginner
	case Intermediate.String():
		fallthrough
	case Intermediate.StringShort():
		return Intermediate
	case Advanced.String():
		fallthrough
	case Advanced.StringShort():
		return Advanced
	}
	return InvalidExperience
}

type AgeGroup int

const (
	InvalidAge AgeGroup = iota
	Child
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
		return "child"
	case Youth:
		return "youth"
	case GroupC:
		return "group c"
	case GroupB:
		return "group b"
	case GroupA:
		return "group a"
	case Adult:
		return "adult i"
	case AdultII:
		return "adult ii"
	}
	return "Age Group(" + strconv.Itoa(int(t)) + ")"
}

func ToAgeGroup(s string) AgeGroup {
	switch strings.ToLower(s) {
	case Child.String():
		return Child
	case Youth.String():
		return Youth
	case GroupC.String():
		return GroupC
	case GroupB.String():
		return GroupB
	case GroupA.String():
		return GroupA
	case Adult.String():
		return Adult
	case AdultII.String():
		return AdultII
	}
	return InvalidAge
}

type Gender int

const (
	OtherGender Gender = iota
	Female
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

func ToGender(s string) Gender {
	if len(s) == 1 {
		switch strings.ToUpper(s) {
		case Female.StringShort():
			return Female
		case Male.StringShort():
			return Male
		}
	}
	switch strings.ToLower(s) {
	case Female.String():
		return Female
	case Male.String():
		return Male
	}
	return OtherGender
}

type Ruleset int

const (
	InvalidRuleset Ruleset = iota
	USWU
	IWUF
	IWUFAB
)

var AllRulesets = []Ruleset{USWU, IWUF, IWUFAB}

func (t Ruleset) String() string {
	switch t {
	case USWU:
		return "uswu"
	case IWUF:
		return "iwuf"
	case IWUFAB:
		return "iwuf-ab"
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

const (
	Northern Category = iota
	Southern
	Taiji
)

var AllStyles = []Style{Changquan, Daoshu, Jianshu, Gunshu, Qiangshu, Nanquan, Nandao, Nangun, Taijiquan, Taijijian}

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

func ToDeduction(code string, style Style) DeductionCode {
	var (
		d  DeductionCode
		ok bool
	)
	if d, ok = AllDeductions[code]; ok {
		return d
	}
	return InvalidDeduction
}

func ToNanduCode(code string, style Style) NanduCode {
	var (
		n  NanduCode
		ok bool
	)
	if style.Category() == Taiji {
		// some taiji nandu codes overlap w/ standard codes
		if n, ok = TaijiNanduCodes[code]; ok {
			return n
		}
	}
	if n, ok = NanduCodes[code]; ok {
		return n
	}
	if n, ok = NanduConnectionCodes[code]; ok {
		return n
	}
	return InvalidNanduCode
}

func IsConnection(code string) bool {
	_, ok := NanduConnectionCodes[code]
	return ok
}

var (
	InvalidDeduction = DeductionCode{"", 0.0, ""}
	AllDeductions    = map[string]DeductionCode{
		"01":  {"01", 0.1, ""},
		"02":  {"02", 0.1, ""},
		"03":  {"03", 0.1, ""},
		"04":  {"04", 0.1, ""},
		"05":  {"05", 0.1, ""},
		"06":  {"06", 0.1, ""},
		"10":  {"10", 0.1, ""},
		"12":  {"12", 0.1, ""},
		"13":  {"13", 0.1, ""},
		"14":  {"14", 0.1, ""},
		"15":  {"15", 0.1, ""},
		"16":  {"16", 0.1, ""},
		"17":  {"17", 0.1, ""},
		"18":  {"18", 0.1, ""},
		"19":  {"19", 0.1, ""},
		"20":  {"20", 0.1, ""},
		"21":  {"21", 0.1, ""},
		"22":  {"22", 0.1, ""},
		"23":  {"23", 0.1, ""},
		"24":  {"24", 0.1, ""},
		"25":  {"25", 0.1, ""},
		"26":  {"26", 0.1, ""},
		"27":  {"27", 0.1, ""},
		"30":  {"30", 0.1, ""},
		"31":  {"31", 0.1, ""},
		"32":  {"32", 0.1, ""},
		"33":  {"33", 0.1, ""},
		"34":  {"34", 0.1, ""},
		"40":  {"40", 0.1, ""},
		"42":  {"42", 0.1, ""},
		"50":  {"50", 0.1, ""},
		"51":  {"51", 0.1, ""},
		"52":  {"52", 0.1, ""},
		"53":  {"53", 0.1, ""},
		"54":  {"54", 0.1, ""},
		"55":  {"55", 0.1, ""},
		"56":  {"56", 0.1, ""},
		"57":  {"57", 0.1, ""},
		"58":  {"58", 0.1, ""},
		"59":  {"59", 0.1, ""},
		"60":  {"60", 0.1, ""},
		"61":  {"61", 0.1, ""},
		"62":  {"62", 0.1, ""},
		"63":  {"63", 0.1, ""},
		"64":  {"64", 0.1, ""},
		"65":  {"65", 0.1, ""},
		"66":  {"66", 0.1, ""},
		"67":  {"67", 0.1, ""},
		"68":  {"68", 0.1, ""},
		"69":  {"69", 0.1, ""},
		"70A": {"70A", 0.05, ""},
		"70B": {"70B", 0.1, ""},
		"71":  {"71", 0.2, ""},
		"72":  {"72", 0.3, ""},
		"73":  {"73", 0.1, ""},
		"74":  {"74", 0.2, ""},
		"75":  {"75", 0.3, ""},
		"76":  {"76", 0.1, ""},
		"77":  {"77", 0.1, ""},
		"78":  {"78", 0.1, ""},
		"79":  {"79", 0.1, ""},
		"80":  {"80", 0.2, ""},
		"81":  {"81", 0.1, ""},
		"82":  {"82", 0.2, ""},
		"83":  {"83", 0.1, ""},
		"84":  {"84", 0.1, ""},
		"85":  {"85", 0.1, ""},
		"86":  {"86", 0.5, ""},
		"90":  {"90", 0.1, ""},
		"91":  {"91", 0.1, ""},
		"92":  {"92", 0.1, ""},
		"93":  {"93", 0.1, ""},
		"94":  {"94", 0.1, ""},
		"95":  {"95", 0.1, ""},
		"96":  {"96", 0.1, ""},
		"97":  {"97", 0.1, ""},
		"99":  {"99", 0.1, ""},
	}

	InvalidNanduCode = NanduCode{"", 0.0, ""}
	NanduCodes       = map[string]NanduCode{
		"111A": {"111A", 0.2, "standing leg to head"},
		"112A": {"112A", 0.2, "side kick and hold leg"},
		"113A": {"113A", 0.2, "backward balance"},
		"143A": {"143A", 0.2, "low balance with leg forward"},
		"142A": {"142A", 0.2, "low stepping on kick forward"},
		"132A": {"132A", 0.2, "balance with sideward sole kick"},
		"133B": {"133B", 0.3, "balance with arms spread"},
		"143B": {"143B", 0.3, "low balance with leg behind support leg"},
		"112C": {"112C", 0.4, "back kick and hold leg"},
		"113C": {"113C", 0.4, "raise leg sideways with heel up"},
		"244A": {"244A", 0.2, "540 front sweep"},
		"212A": {"212A", 0.2, "parting kick and heel kick"},
		"244B": {"244B", 0.3, "900 front sweep"},
		"323A": {"323A", 0.2, "360 tornado kick"},
		"333A": {"333A", 0.2, "butterfly"},
		"324A": {"324A", 0.2, "360 lotus kick"},
		"335A": {"335A", 0.2, "aerial cartwheel"},
		"312A": {"312A", 0.2, "kick in flight"},
		"346A": {"346A", 0.2, "backflip"},
		"323B": {"323B", 0.3, "540 tornado kick"},
		"353B": {"353B", 0.3, "360 butterfly"},
		"324B": {"324B", 0.3, "540 lotus kick"},
		"355B": {"355B", 0.3, "360 aerial cartwheel"},
		"312B": {"312B", 0.3, "front kick in flight"},
		"322B": {"322B", 0.3, "180 kick in flight"},
		"346B": {"346B", 0.3, "single-step backflip (gainer)"},
		"355C": {"355C", 0.4, "720 aerial cartwheel"},
		"323C": {"323C", 0.4, "720 tornado kick"},
		"353C": {"353C", 0.4, "720 butterfly"},
		"324C": {"324C", 0.4, "720 lotus kick"},
		"366C": {"366C", 0.4, "360 single-step back butterfly"},
		"415A": {"415A", 0.2, "double sidekick in flight"},
		"423A": {"423A", 0.2, "360 tornado land on side"},
		"447C": {"447C", 0.4, "kip-up"},
	}

	TaijiNanduCodes = map[string]NanduCode{
		"143B": {"143B", 0.3, "Low Balance with Leg Crossed Behind"},
		"312A": {"312A", 0.2, "Jumping Front Slap Kick"},
		"312B": {"312B", 0.3, "Jumping Front Straight Kick"},
		"323A": {"323A", 0.2, "Tornado Kick 180°"},
		"324B": {"324B", 0.3, "Jumping Lotus Kick 360°"},
	}

	NanduConnectionCodes = map[string]NanduCode{
		"312B+8":    {"312B+8", 0.15, ""},
		"312A+324B": {"312A+324B", 0.15, ""},
		"324B+5":    {"324B+5", 0.15, ""},
		"312A+3":    {"312A+3", 0.1, ""},
		"323A+3":    {"323A+3", 0.1, ""},
	}
)
