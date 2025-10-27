import React from "react";

const EditableInput = React.memo(
  ({
    value,
    onSave,
    shotId,
    onFocusShot,
    onBlurShot,
    type = "text",
    placeholder = "",
    style = {},
    variant = "default",
  }) => {
    const [localValue, setLocalValue] = React.useState(value || "");

    React.useEffect(() => {
      setLocalValue(value || "");
    }, [value]);

    const handleFocus = () => {
      if (onFocusShot && shotId) onFocusShot(shotId);
    };

    const handleBlur = () => {
      if (localValue !== value) {
        onSave(localValue);
      }
      if (onBlurShot) onBlurShot();
    };

    const handleKeyPress = (e) => {
      if (e.key === "Enter") {
        e.target.blur(); // Blur the field, which triggers handleBlur
      }
    };

    // Default styles for different variants
    const getDefaultStyle = () => {
      switch (variant) {
        case "shotlist":
          return {
            fontSize: "10px",
            padding: "2px",
            border: "1px solid #ccc",
            borderRadius: "2px",
            width: "100%",
            minHeight: "16px",
            boxSizing: "border-box",
          };
        case "todo":
          return {
            fontSize: "12px",
            padding: "4px",
            border: "1px solid #ccc",
            borderRadius: "3px",
            width: "100%",
            boxSizing: "border-box",
          };
        default:
          return {};
      }
    };

    return (
      <input
        type={type}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        style={{
          ...getDefaultStyle(),
          ...style,
        }}
      />
    );
  }
);

export default EditableInput;
