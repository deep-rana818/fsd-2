import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import App from "./app.jsx";

afterEach(() => {
  cleanup();
});

describe("Interactive calendar optimization experiment", () => {
  function dropPostOnFirstDay(container, postId = "p5") {
    const firstDay = container.querySelector(".day-cell");

    fireEvent.drop(firstDay, {
      dataTransfer: {
        getData: () => postId,
      },
    });
  }

  test("renders the calendar, backlog, and optimization monitor", () => {
    const { container } = render(<App />);

    expect(screen.getByText("Interactive Calendar Optimization & Testing")).toBeInTheDocument();
    expect(screen.getByText("Post Backlog")).toBeInTheDocument();
    expect(screen.getByText("Render Monitor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Optimized" })).toHaveClass("active");
    expect(container.querySelectorAll(".day-cell")).toHaveLength(31);
  });

  test("toggles between optimized and non optimized modes", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Non optimized" }));
    expect(screen.getByRole("button", { name: "Non optimized" })).toHaveClass("active");

    fireEvent.click(screen.getByRole("button", { name: "Optimized" }));
    expect(screen.getByRole("button", { name: "Optimized" })).toHaveClass("active");
  });

  test("optimized mode counts only the changed day when dropping an unscheduled post", () => {
    const { container } = render(<App />);
    const firstCellRender = () => container.querySelector(".day-cell .render-pill").textContent;
    const secondCellRender = () => container.querySelectorAll(".day-cell .render-pill")[1].textContent;

    expect(firstCellRender()).toBe("R1");
    expect(secondCellRender()).toBe("R1");

    dropPostOnFirstDay(container);

    expect(firstCellRender()).toBe("R2");
    expect(secondCellRender()).toBe("R1");
    expect(screen.getByTestId("last-cell-render-impact")).toHaveTextContent("1");
  });

  test("non optimized mode rerenders all 31 day cells after one drop", () => {
    const { container } = render(<App />);
    const firstCellRender = () => container.querySelector(".day-cell .render-pill").textContent;
    const secondCellRender = () => container.querySelectorAll(".day-cell .render-pill")[1].textContent;

    fireEvent.click(screen.getByRole("button", { name: "Non optimized" }));
    expect(firstCellRender()).toBe("R1");
    expect(secondCellRender()).toBe("R1");

    dropPostOnFirstDay(container);

    expect(firstCellRender()).toBe("R2");
    expect(secondCellRender()).toBe("R2");
    expect(screen.getByTestId("last-cell-render-impact")).toHaveTextContent("31");
  });

  test("reset clears drag/drop render impact and counters", () => {
    const { container } = render(<App />);
    const firstCellRender = () => container.querySelector(".day-cell .render-pill").textContent;

    fireEvent.click(screen.getByRole("button", { name: "Non optimized" }));
    dropPostOnFirstDay(container);

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(firstCellRender()).toBe("R1");
    expect(screen.getByTestId("last-cell-render-impact")).toHaveTextContent("0");
    expect(screen.getByRole("button", { name: "Optimized" })).toHaveClass("active");
  });
});
