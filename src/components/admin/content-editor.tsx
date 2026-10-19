"use client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
function emptyLike(value: unknown): unknown {
  if (typeof value === "string") return "";
  if (Array.isArray(value)) return [];
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, emptyLike(item)]),
    );
  return value;
}
function label(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (v) => v.toUpperCase());
}
export function ContentEditor({
  value,
  template,
  path,
  onChange,
}: {
  value: unknown;
  template: unknown;
  path: string;
  onChange: (value: unknown) => void;
}) {
  if (typeof value === "string") {
    const title = label(path.split(".").at(-1) ?? "Text");
    const multiline =
      value.length > 90 ||
      value.includes("\n") ||
      /description|answer|title/i.test(title);
    return (
      <div className="form-field">
        <label htmlFor={`content-${path}`}>{title}</label>
        {multiline ? (
          <Textarea
            id={`content-${path}`}
            value={value}
            rows={3}
            onChange={(e) => onChange(e.target.value)}
            maxLength={6000}
          />
        ) : (
          <Input
            id={`content-${path}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={6000}
          />
        )}
      </div>
    );
  }
  if (Array.isArray(value)) {
    const example = Array.isArray(template) ? template : [];
    return (
      <div className="admin-content-array">
        {value.map((item, index) => (
          <div className="admin-editor-group" key={index}>
            <div className="admin-group-title">
              <h3>Item {index + 1}</h3>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="text-action"
              >
                Remove
              </button>
            </div>
            <ContentEditor
              value={item}
              template={example[0]}
              path={`${path}.${index}`}
              onChange={(next) =>
                onChange(value.map((old, i) => (i === index ? next : old)))
              }
            />
          </div>
        ))}
        <Button
          variant="outline"
          type="button"
          onClick={() => onChange([...value, emptyLike(example[0] ?? "")])}
        >
          Add item
        </Button>
      </div>
    );
  }
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    const defaults = (template ?? {}) as Record<string, unknown>;
    return (
      <>
        {Object.entries(object).map(([key, item]) => (
          <ContentEditor
            key={key}
            value={item}
            template={defaults[key]}
            path={`${path}.${key}`}
            onChange={(next) => onChange({ ...object, [key]: next })}
          />
        ))}
      </>
    );
  }
  return null;
}
