// Nested mobile frames are relative to the group's content, while mobile.frame
// remains the element's independent placement when it is a top-level element.
export const groupChildFrame = (element, mobile) => mobile && element.mobile?.groupFrame ? element.mobile.groupFrame : element.frame;

export function groupDeviceProps(element, mobile) {
  const own = mobile && element.mobile;
  const frame = own?.groupFrame || own?.frame;
  return own?.contentWidth > 0 ? { contentWidth: own.contentWidth, contentHeight: own.contentHeight || 0,
    ...(frame ? { width: frame.w, height: frame.h } : {}) } : {};
}
