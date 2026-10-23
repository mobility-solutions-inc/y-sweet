interface TitleProps {
  children: string
}

export default function Title(props: TitleProps): React.JSX.Element {
  return <h1 className="text-xl font-bold text-pink-950">{props.children}</h1>
}
