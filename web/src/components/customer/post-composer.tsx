"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPostAction } from "@/app/customer/actions";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { IDLE } from "@/lib/types";
import { BLOG_WORD_LIMIT, wordCount } from "@/lib/validation";
import { cn } from "@/lib/utils";

export function PostComposer({ name }: { name: string }) {
  const [state, action] = useActionState(createPostAction, IDLE);
  const [text, setText] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const words = wordCount(text);
  const over = words > BLOG_WORD_LIMIT;

  useEffect(() => {
    if (state.status === "ok") {
      form.current?.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText("");
    }
  }, [state]);

  return (
    <form ref={form} action={action} className="space-y-3 rounded-3xl border bg-card p-4 shadow-sm">
      <label htmlFor="post-content" className="text-sm font-semibold">
        Share your story, {name}
      </label>
      <Textarea
        id="post-content"
        name="content"
        required
        rows={3}
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share your story at here! Please enter less than 300 words."
        aria-describedby="post-count"
        className="resize-none rounded-2xl"
      />
      <div className="flex items-center justify-between gap-3">
        <span
          id="post-count"
          className={cn("tabular text-xs", over ? "text-tomato-600" : "text-muted-foreground")}
        >
          {words} / {BLOG_WORD_LIMIT} words
        </span>
        <SubmitButton className="h-10 rounded-full px-5" disabled={!text.trim() || over}>
          <Send aria-hidden /> Post
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
