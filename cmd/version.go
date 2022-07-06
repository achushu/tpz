package cmd

import (
	"github.com/spf13/cobra"

	"github.com/achushu/libs/out"
)

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "print build information",
	Run: func(cmd *cobra.Command, args []string) {
		out.WriteString("Ten Point Zero " + Version + " (build " + Build + ")")
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
}
