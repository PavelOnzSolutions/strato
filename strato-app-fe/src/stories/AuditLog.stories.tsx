import AuditLog from "../pages/admin/AuditLog.tsx";
import { Meta, StoryObj } from "@storybook/react";

const meta = {
    component: AuditLog
} satisfies Meta<typeof AuditLog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Mocked: Story = {
    args: {

    }
}