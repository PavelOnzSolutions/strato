import Dashboard from "../pages/Dashboard";
import { Meta, StoryObj } from "@storybook/react";

const meta = {
    component: Dashboard
} satisfies Meta<typeof Dashboard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Mocked: Story = {
    args: {

    }
}