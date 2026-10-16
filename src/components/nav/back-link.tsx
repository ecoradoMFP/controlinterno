import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="outline" size="sm" render={<Link href={href} />}>
      <ArrowLeftIcon />
      {label}
    </Button>
  );
}
