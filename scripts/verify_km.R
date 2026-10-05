# Reference values for web/src/lib/stats/survival.ts (Kaplan-Meier with
# Greenwood standard errors and log-log intervals). The Vitest suite pins
# these numbers; rerun to check them:
#
#   Rscript scripts/verify_km.R
library(survival)

show <- function(label, time, event) {
  fit <- survfit(Surv(time, event) ~ 1, conf.type = "log-log")
  cat("#", label, "\n")
  print(data.frame(
    time = fit$time, n.risk = fit$n.risk, n.event = fit$n.event, n.censor = fit$n.censor,
    surv = sprintf("%.15f", fit$surv), std.err = sprintf("%.15f", fit$std.err),
    lower = sprintf("%.15f", fit$lower), upper = sprintf("%.15f", fit$upper)
  ), row.names = FALSE)
  cat("median:", summary(fit)$table["median"], "\n\n")
}

# Minutes from order to "ready", with ties and censoring (0 = still preparing).
show("fulfilment",
  time  = c(4.5, 6, 6, 7.2, 8, 9.5, 9.5, 11, 12, 12, 13.4, 15, 16.2, 18, 21, 3, 9.5, 14, 25),
  event = c(1,   1, 1, 1,   0, 1,   1,   1,  1,  0,  1,    1,  1,    1,  1,  0, 0,   0,  0))

# The classic leukaemia (aml, maintained arm) data shipped with survival.
m <- aml[aml$x == "Maintained", ]
show("aml maintained", m$time, m$status)
