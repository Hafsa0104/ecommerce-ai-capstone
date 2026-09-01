// @vitest-environment jsdom
// ============================================================
// components/QuantityStepper.test.tsx — component test for the
// [-] qty [+] control shared by ProductPurchasePanel and the
// Quote/Customization dialogs. Chosen as the component under test
// because it has no Context, routing, or image-loader dependency —
// it can be rendered and interacted with in complete isolation, so
// this test exercises the REAL component exactly as shipped, not a
// simplified stand-in.
//
// `@vitest-environment jsdom` is scoped to this file only — the
// existing services/lib tests keep running under the project's
// default "node" environment (see vitest.config.mts), untouched.
// ============================================================
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import QuantityStepper from "./QuantityStepper";

// React Testing Library doesn't auto-unmount between tests under
// Vitest the way it does under Jest — without this, each test's
// render() would stack on top of the previous one's leftover DOM,
// producing "found multiple elements" failures unrelated to the
// component itself.
afterEach(cleanup);

describe("QuantityStepper", () => {
  it("renders the initial value passed in", () => {
    render(<QuantityStepper id="qty" value={5} onChange={() => {}} />);
    expect((screen.getByRole("spinbutton") as HTMLInputElement).value).toBe("5");
  });

  it("clicking Increase calls onChange with value + 1", () => {
    const onChange = vi.fn();
    render(<QuantityStepper id="qty" value={5} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it("clicking Decrease calls onChange with value - 1", () => {
    const onChange = vi.fn();
    render(<QuantityStepper id="qty" value={5} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Decrease quantity" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("does not decrease below the configured minimum", () => {
    // At min, the Decrease button is disabled (see the next test) — a
    // real click on a disabled button never fires onClick at all, which
    // is itself the mechanism preventing onChange from ever being
    // called with a value below min.
    const onChange = vi.fn();
    render(<QuantityStepper id="qty" value={1} onChange={onChange} min={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Decrease quantity" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disables the Decrease button once value is at the minimum", () => {
    render(<QuantityStepper id="qty" value={1} onChange={() => {}} min={1} />);
    const decreaseBtn = screen.getByRole("button", { name: "Decrease quantity" }) as HTMLButtonElement;
    expect(decreaseBtn.disabled).toBe(true);
  });

  it("does not disable Decrease when value is above the minimum", () => {
    render(<QuantityStepper id="qty" value={2} onChange={() => {}} min={1} />);
    const decreaseBtn = screen.getByRole("button", { name: "Decrease quantity" }) as HTMLButtonElement;
    expect(decreaseBtn.disabled).toBe(false);
  });

  it("typing a number into the input and blurring commits it via onChange", () => {
    const onChange = vi.fn();
    render(<QuantityStepper id="qty" value={1} onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "25" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(25);
  });

  it("falls back to the minimum when the input is cleared and blurred", () => {
    const onChange = vi.fn();
    render(<QuantityStepper id="qty" value={5} onChange={onChange} min={1} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("pressing Enter commits the typed value the same way blur does", () => {
    const onChange = vi.fn();
    render(<QuantityStepper id="qty" value={1} onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(12);
  });

  it("exposes the existing accessible names for both buttons", () => {
    render(<QuantityStepper id="qty" value={3} onChange={() => {}} />);
    // getByRole throws (failing the test) if no matching element exists,
    // so successfully finding both is itself the assertion that these
    // accessible names are present in the rendered output.
    expect(screen.getByRole("button", { name: "Increase quantity" }).tagName).toBe("BUTTON");
    expect(screen.getByRole("button", { name: "Decrease quantity" }).tagName).toBe("BUTTON");
  });
});
