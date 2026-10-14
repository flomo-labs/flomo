import { contactEmail } from "@/content/legal";

export function ContactInfo() {
  return (
    <a href={`mailto:${contactEmail}`} className="underline underline-offset-4">
      {contactEmail}
    </a>
  );
}
