const MenuTip: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        height: 0,
        width: 0,
        borderLeft: "0.5rem outset transparent",
        borderRight: "0.5rem outset transparent",
        borderTop: "0.5rem outset white",
        rotate: "180deg",
        top: "100%",
        left: "50%",
        transform: "translate(50%, -1px)",
        marginLeft: "auto",
        marginRight: "auto",
        marginTop: "-0.25rem",
        zIndex: 1
      }}
    />
  );
};

export default MenuTip;
