import Form from "next/form";
import { contentQueryMaxLength, contentQueryMinLength } from "@biling/schemas";

export function DiscoveryForm({
  action,
  label,
  placeholder,
  query = "",
  featured,
  className = "",
}: {
  action: "/search" | "/shows";
  label: string;
  placeholder: string;
  query?: string;
  featured?: string;
  className?: string;
}) {
  return (
    <Form
      action={action}
      className={`discovery-form ${className}`.trim()}
      prefetch={false}
      role="search"
      aria-label={label}
    >
      {featured && <input type="hidden" name="featured" value={featured} />}
      <label>
        <span className="sr-only">{label}</span>
        <input
          key={query}
          name="q"
          type="search"
          dir="auto"
          autoComplete="off"
          minLength={contentQueryMinLength}
          maxLength={contentQueryMaxLength}
          defaultValue={query}
          placeholder={placeholder}
        />
      </label>
      <button type="submit">Search</button>
    </Form>
  );
}
