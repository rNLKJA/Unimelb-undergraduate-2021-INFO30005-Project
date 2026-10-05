"use client";

import { Star } from "lucide-react";
import { useActionState, useState } from "react";
import { rateOrderAction } from "@/app/customer/actions";
import { FormMessage } from "@/components/shared/form-message";
import { Stars } from "@/components/shared/stars";
import { SubmitButton } from "@/components/shared/submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RATING_VALUES } from "@/lib/order-rules";
import { IDLE } from "@/lib/types";
import { cn } from "@/lib/utils";

const WORDS = ["", "Not great", "Could be better", "Good", "Great", "Perfect"];

/** Port of the order-detail rating form: a 1–5 rating plus an optional comment, once. */
export function RatingForm({
  orderId,
  rating,
  comment,
}: {
  orderId: string;
  rating: number | null;
  comment: string | null;
}) {
  const [state, action] = useActionState(rateOrderAction, IDLE);
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);

  if (rating || state.status === "ok") {
    return (
      <div className="space-y-2">
        <p className="font-semibold">Thanks for your Rating</p>
        <Stars value={rating ?? value} size="size-5" />
        {comment ? (
          <p className="text-sm text-muted-foreground italic">&ldquo;{comment}&rdquo;</p>
        ) : null}
      </div>
    );
  }

  const shown = hover || value;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Rating to this order</legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {RATING_VALUES.map((n) => (
            <label
              key={n}
              className="cursor-pointer rounded-md p-0.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring"
              onMouseEnter={() => setHover(n)}
            >
              <input
                type="radio"
                name="rating"
                value={n}
                className="sr-only"
                checked={value === n}
                onChange={() => setValue(n)}
                required
              />
              <Star
                className={cn(
                  "size-8 transition-transform",
                  n <= shown
                    ? "scale-110 fill-honey-400 text-honey-500"
                    : "text-espresso-200 dark:text-espresso-600",
                )}
                aria-hidden
              />
              <span className="sr-only">
                {n} star{n === 1 ? "" : "s"}
              </span>
            </label>
          ))}
          <span className="ml-2 text-sm text-muted-foreground" aria-live="polite">
            {WORDS[shown]}
          </span>
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <Label htmlFor={`comment-${orderId}`}>Comment (optional)</Label>
        <Textarea
          id={`comment-${orderId}`}
          name="comment"
          maxLength={500}
          placeholder="Please comment if you need"
          rows={3}
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="h-10 rounded-full px-5" disabled={!value}>
        Submit rating
      </SubmitButton>
    </form>
  );
}
