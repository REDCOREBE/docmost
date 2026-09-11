import { rem } from "@mantine/core";

interface Props {
  size?: number | string;
}

/** Local 1Password logo for slash menu (public/icons/onepassword-logo.png). */
export function OnePasswordIcon({ size = 18 }: Props) {
  return (
    <img
      src="/icons/onepassword-logo.png"
      alt=""
      width={typeof size === "number" ? size : undefined}
      height={typeof size === "number" ? size : undefined}
      style={{
        width: rem(size),
        height: rem(size),
        borderRadius: "50%",
        objectFit: "contain",
        display: "block",
      }}
      draggable={false}
    />
  );
}
