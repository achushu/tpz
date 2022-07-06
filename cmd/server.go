package cmd

import (
	"os"

	"github.com/achushu/libs/out"
	"github.com/achushu/tpz/server"

	"github.com/spf13/cobra"
)

var (
	profileFlag bool
	profileFunc func()
)

var serverCmd = &cobra.Command{
	Use:   "server [CONFIG] [-P]",
	Short: "start the judging server",
	Run: func(cmd *cobra.Command, args []string) {
		cfg := "config.yml"
		if len(args) > 0 {
			cfg = args[0]
		}
		out.Debugln("debug output enabled") // only prints if built with debug tag
		if profileFlag {
			if profileFunc != nil {
				profileFunc()
			} else {
				out.Errorln("binary must be built with profile tag")
			}
		}
		if s, err := server.New(cfg); err == nil {
			if err = s.Start(); err != nil {
				out.Errorln(err)
				os.Exit(1)
			}
		} else {
			out.Errorln(err)
			os.Exit(1)
		}
	},
	Args: cobra.MaximumNArgs(1),
}

func init() {
	serverCmd.PersistentFlags().BoolVarP(&profileFlag, "profile", "P", false, "enable CPU profiling and reporting")
	rootCmd.AddCommand(serverCmd)
}
