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
	IWUF
	IWUFAB
)

var AllRulesets = []Ruleset{USWU}

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

func ToDeduction(code string, style Style) DeductionCode {
	var (
		d  DeductionCode
		ok bool
	)
	if d, ok = GeneralDeductions[code]; ok {
		return d
	}
	switch style.Category() {
	case Northern:
		d, ok = NorthernDeductions[code]
	case Southern:
		d, ok = SouthernDeductions[code]
	case Taiji:
		d, ok = TaijiDeductions[code]
	}
	if ok {
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
	InvalidDeduction   = DeductionCode{"", 0.0, ""}
	NorthernDeductions = map[string]DeductionCode{
		"10": {"10", 0.1, ""},
		"11": {"11", 0.1, ""},
		"12": {"12", 0.1, ""},
		"13": {"13", 0.1, ""},
		"14": {"14", 0.1, ""},
		"20": {"20", 0.1, ""},
		"21": {"21", 0.1, ""},
		"22": {"22", 0.1, ""},
		"23": {"23", 0.1, ""},
		"30": {"30", 0.1, ""},
		"31": {"31", 0.1, ""},
		"32": {"32", 0.1, ""},
		"33": {"33", 0.1, ""},
		"34": {"34", 0.1, ""},
		"50": {"50", 0.1, ""},
		"51": {"51", 0.1, ""},
		"52": {"52", 0.1, ""},
		"60": {"60", 0.1, ""},
		"61": {"61", 0.1, ""},
		"62": {"62", 0.1, ""},
		"63": {"63", 0.1, ""},
		"64": {"64", 0.1, ""},
		"65": {"65", 0.1, ""},
		"66": {"66", 0.1, ""},
	}

	TaijiDeductions = map[string]DeductionCode{
		"15": {"15", 0.1, ""},
		"16": {"16", 0.1, ""},
		"17": {"17", 0.1, ""},
		"18": {"18", 0.1, ""},
		"24": {"24", 0.1, ""},
		"25": {"25", 0.1, ""},
		"26": {"26", 0.1, ""},
		"27": {"27", 0.1, ""},
		"30": {"30", 0.1, ""},
		"31": {"31", 0.1, ""},
		"50": {"50", 0.1, ""},
		"53": {"53", 0.1, ""},
		"54": {"54", 0.1, ""},
		"60": {"60", 0.1, ""},
		"61": {"61", 0.1, ""},
	}

	SouthernDeductions = map[string]DeductionCode{
		"22": {"22", 0.1, ""},
		"28": {"28", 0.1, ""},
		"30": {"30", 0.1, ""},
		"40": {"40", 0.1, ""},
		"41": {"41", 0.1, ""},
		"42": {"42", 0.1, ""},
		"50": {"50", 0.1, ""},
		"51": {"51", 0.1, ""},
		"52": {"52", 0.1, ""},
		"53": {"53", 0.1, ""},
		"55": {"55", 0.1, ""},
		"56": {"56", 0.1, ""},
		"57": {"57", 0.1, ""},
		"62": {"62", 0.1, ""},
		"67": {"67", 0.1, ""},
	}

	GeneralDeductions = map[string]DeductionCode{
		"01": {"01", 0.2, ""},
		"02": {"02", 0.2, ""},
		"03": {"03", 0.2, ""},
		"04": {"04", 0.2, ""},
		"05": {"05", 0.2, ""},
		"06": {"06", 0.2, ""},
		"07": {"07", 0.2, ""},
		"08": {"08", 0.2, ""},
		"70": {"70", 0.1, ""},
		"71": {"71", 0.2, ""},
		"72": {"72", 0.3, ""},
		"73": {"73", 0.1, ""},
		"74": {"74", 0.2, ""},
		"75": {"75", 0.3, ""},
		"76": {"76", 0.1, ""},
		"77": {"77", 0.1, ""},
		"78": {"78", 0.1, ""},
		"79": {"79", 0.1, ""},
		"80": {"80", 0.2, ""},
		"81": {"81", 0.1, ""},
		"82": {"82", 0.1, ""},
		"83": {"83", 0.1, ""},
		"84": {"84", 0.3, ""},
		"85": {"85", 0.5, ""},
		"86": {"86", 0.2, ""},
		"87": {"87", 0.2, ""},
		"88": {"88", 0.2, ""},
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
		"323B": {"323B", 0.3, "360 tornado kick"},
		"323C": {"323C", 0.4, "540 tornado kick"},
		"324B": {"324B", 0.3, "360 lotus kick"},
		"324C": {"324C", 0.4, "540 lotus kick"},
	}

	NanduConnectionCodes = map[string]NanduCode{
		"(A)": {"(A)", 0.1, ""},
		"1A":  {"1A", 0.1, "horse stance"},
		"2A":  {"2A", 0.1, "butterfly stance"},
		"3A":  {"3A", 0.1, "standing with knee raised"},
		"4A":  {"4A", 0.1, "front split"},
		"6A":  {"6A", 0.1, "sitting position"},
		"7A":  {"7A", 0.1, "bow stance"},
		"8A":  {"8A", 0.1, "throw and catch"},
		"9A":  {"9A", 0.1, "land on takeoff foot"},
		"(B)": {"(B)", 0.15, ""},
		"1B":  {"1B", 0.15, "horse stance"},
		"2B":  {"2B", 0.15, "butterfly stance"},
		"3B":  {"3B", 0.15, "stand with knee raised"},
		"4B":  {"4B", 0.15, "front split"},
		"5B":  {"5B", 0.15, "dragons dive"},
		"8B":  {"8B", 0.15, "throw and catch"},
		"(C)": {"(C)", 0.2, ""},
		"1C":  {"1C", 0.2, "horse stance"},
		"2C":  {"2C", 0.2, "butterfly stance"},
		"3C":  {"3C", 0.2, "stand with knee raised"},
		"5C":  {"5C", 0.2, "dragons dive"},
		"1D":  {"1D", 0.25, "horse stance"},
		"3D":  {"3D", 0.25, "stand with knee raised"},
		"4D":  {"4D", 0.25, "front split"},
	}
)
