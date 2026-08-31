"use client";

// components/CustomizationRequestDialog.tsx — "Request Customization"
// trigger + form, rendered from the product-detail Specification
// section next to the Customization row. Reusable across every
// category: the customization text shown for context comes from that
// product's own resolved spec (see getSpecs() / CATEGORY_SPEC_DEFAULTS
// in services/), this component only owns the request form itself.
//
// Frontend-only prototype: the chosen file never leaves this
// component's local state — there is no upload, no server, nothing sent
// to a supplier. Submitting only validates the input and shows a local
// success message; the note rendered in that state says so explicitly.
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Palette, CheckCircle2 } from "lucide-react";
import Dialog from "./Dialog";
import QuantityStepper from "./QuantityStepper";
import styles from "./RequestDialogs.module.css";

interface CustomizationRequestDialogProps {
  productName: string;
  customizationText: string;
  defaultQuantity?: number;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
];

export default function CustomizationRequestDialog({
  productName,
  customizationText,
  defaultQuantity = 100,
}: CustomizationRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(defaultQuantity);
  const [requirements, setRequirements] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const qtyFieldId = useId();
  const requirementsFieldId = useId();
  const fileFieldId = useId();
  const fileHintId = useId();
  const fileErrorId = useId();
  const formErrorId = useId();

  // Fresh slate every time the dialog is (re)opened, rather than
  // showing a stale success/error state or a leftover file selection
  // from a previous visit. Done during render (React's documented
  // pattern for "adjusting state when a prop changes"), not in a
  // useEffect — an effect would commit the stale values for one frame
  // before immediately re-rendering with the reset ones.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuantity(defaultQuantity);
      setRequirements("");
      setFile(null);
      setFileError("");
      setFormError("");
      setSubmitted(false);
    }
  }

  // The native file input keeps its own DOM value independent of React
  // state — clearing that display (an imperative DOM mutation, not
  // state) still belongs in an effect rather than during render.
  useEffect(() => {
    if (open && fileInputRef.current) fileInputRef.current.value = "";
  }, [open]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0] ?? null;
    if (!chosen) {
      setFile(null);
      setFileError("");
      return;
    }
    if (!ACCEPTED_FILE_TYPES.includes(chosen.type)) {
      setFileError("Unsupported file type. Choose an image (PNG, JPG, GIF, WEBP, SVG) or a PDF.");
      setFile(null);
      e.target.value = "";
      return;
    }
    if (chosen.size > MAX_FILE_BYTES) {
      setFileError("That file is too large. Choose a file under 5MB.");
      setFile(null);
      e.target.value = "";
      return;
    }
    setFileError("");
    setFile(chosen);
  }

  function handleRemoveFile() {
    setFile(null);
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // The one validation rule here: a request with neither a
    // description nor a reference file conveys nothing to act on.
    // Everything else (quantity) is already structurally valid — see
    // QuantityStepper, which can't go below 1.
    if (!requirements.trim() && !file) {
      setFormError("Describe your requirements, attach a reference file, or both.");
      return;
    }
    setFormError("");
    // Frontend prototype only — no file is uploaded anywhere and no
    // supplier actually receives this request. See the note below.
    setSubmitted(true);
  }

  return (
    <>
      <button type="button" className={styles.secondaryTrigger} onClick={() => setOpen(true)}>
        <Palette size={16} aria-hidden="true" />
        Request Customization
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Request Customization">
        {submitted ? (
          <div className={styles.successState} aria-live="polite">
            <CheckCircle2 size={28} aria-hidden="true" className={styles.successIcon} />
            <p className={styles.successText}>Customization request submitted.</p>
            <p className={styles.note}>
              This is a frontend prototype interaction — no file was uploaded and no supplier actually received
              this request.
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.primaryBtn} onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <span className={styles.label}>Product</span>
              <p className={styles.readonlyValue}>{productName}</p>
            </div>

            <p className={styles.readonlyValue}>Current listing customization: {customizationText}</p>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={qtyFieldId}>
                Quantity
              </label>
              <QuantityStepper id={qtyFieldId} value={quantity} onChange={setQuantity} />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={requirementsFieldId}>
                Customization requirements
              </label>
              <textarea
                id={requirementsFieldId}
                className={styles.textarea}
                rows={3}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Describe your branding, color, packaging, sizing, or other requirements..."
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={fileFieldId}>
                Logo / reference file <span className={styles.optional}>(optional)</span>
              </label>
              <input
                ref={fileInputRef}
                id={fileFieldId}
                type="file"
                accept={ACCEPTED_FILE_TYPES.join(",")}
                onChange={handleFileChange}
                className={styles.fileInput}
                aria-describedby={fileError ? fileErrorId : fileHintId}
              />
              <p id={fileHintId} className={styles.hint}>
                Image or PDF, up to 5MB. Kept only in this browser tab for this prototype — never uploaded anywhere.
              </p>
              {file && (
                <p className={styles.selectedFile}>
                  Selected file: {file.name}
                  <button type="button" className={styles.removeFileBtn} onClick={handleRemoveFile}>
                    Remove
                  </button>
                </p>
              )}
              {fileError && (
                <p id={fileErrorId} className={styles.errorText} role="alert">
                  {fileError}
                </p>
              )}
            </div>

            {formError && (
              <p id={formErrorId} className={styles.errorText} role="alert">
                {formError}
              </p>
            )}

            <p className={styles.note}>
              Frontend prototype — submitting this form does not send anything to a real supplier.
            </p>

            <div className={styles.actions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryBtn}>
                Submit Request
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
