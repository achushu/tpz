package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var (
	rootCmd = &cobra.Command{
		Use:   "ten-point-zero",
		Short: "manager for wushu judging system",
		Long:  "ten-point-zero manages and serves the wushu judging system",
	}

	// Name of this app
	Name = "Ten Point Zero"
	// Version of this build (ldflag)
	Version string
	// Build tag for this version (ldflag)
	Build string
)

// Execute adds all child commands to the root command and sets flags as appropriate
// Called by main.main()
func Execute() {
	v := Name + " v" + Version + "(" + Build + ")"
	rootCmd.SetVersionTemplate(v)
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func init() {
}
