// plugins/visual-editor/visual-editor-config.js
console.log("[visual-editor-config] CARREGADO");

export const POPUP_STYLES = `
#inline-editor-popup{
  width:360px;
  position:fixed;
  z-index:10000;
  background:#161718;
  color:#fff;
  border:1px solid #4a5568;
  border-radius:16px;
  padding:8px;
  box-shadow:0 4px 12px rgba(0,0,0,.2);
  display:none;
  flex-direction:column;
  gap:10px;
}
#inline-editor-popup.is-active{
  display:flex;
  top:50%;
  left:50%;
  transform:translate(-50%,-50%);
}
#inline-editor-popup textarea{
  height:100px;
  padding:4px 8px;
  background:transparent;
  color:#fff;
  font-family:inherit;
  font-size:.875rem;
  line-height:1.42;
  resize:none;
  outline:none;
}
#inline-editor-popup .button-container{
  display:flex;
  justify-content:flex-end;
  gap:10px;
}
#inline-editor-popup .popup-button{
  border:none;
  padding:6px 16px;
  border-radius:8px;
  cursor:pointer;
  font-size:.75rem;
  font-weight:700;
  height:34px;
}
#inline-editor-popup .save-button{
  background:#673de6;
  color:#fff;
}
#inline-editor-popup .cancel-button{
  background:transparent;
  border:1px solid #3b3d4a;
  color:#fff;
}
#inline-editor-popup .cancel-button:hover{
  background:#474958;
}
`;

export function getPopupHTMLTemplate(saveLabel = "Salvar", cancelLabel = "Cancelar") {
  return `
    <textarea></textarea>
    <div class="button-container">
      <button class="popup-button cancel-button">${cancelLabel}</button>
      <button class="popup-button save-button">${saveLabel}</button>
    </div>
  `;
}

export const EDIT_MODE_STYLES = `
#root[data-edit-mode-enabled="true"] [data-edit-id]{
  cursor:pointer;
  outline:2px dashed #357DF9;
  outline-offset:2px;
  min-height:1em;
}
#root[data-edit-mode-enabled="true"] img[data-edit-id]{ outline-offset:-2px; }
#root[data-edit-mode-enabled="true"] [data-edit-id]:hover{
  background-color:#357DF933;
  outline-color:#357DF9;
}
`;