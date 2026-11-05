import { createFakePluginHost, makePluginAgentConfigurationContext } from "@get-bb/plugin-sdk/testing";
import { describe, expect, it } from "vitest";
import plugin from "./server";

describe("the plugin's settings", () => {
  it("lists Animations, on by default, beside Web lookups", async () => {
    const host = createFakePluginHost({ pluginId: "genui" });
    await plugin(host.bb);
    expect(host.harness.registrations.settingsDescriptors).toMatchObject({
      animations: { type: "boolean", label: "Animations", default: true },
      webLookups: { type: "boolean", label: "Web lookups", default: true },
    });
  });
});

describe("opt-in UI instructions", () => {
  it.each([true, false])("injects no instructions with webLookups=%s", async (webLookups) => {
    const { bb, harness } = createFakePluginHost({
      pluginId: "genui",
      agentSkillIds: ["ui"],
      settings: { webLookups },
    });
    await plugin(bb);
    const config = await harness.behavior.resolveAgentConfiguration(makePluginAgentConfigurationContext({
      thread: { parentThreadId: null },
      origin: { kind: null, pluginId: null },
    }));
    expect(config.tools.map((tool) => tool.name)).toEqual(["check_ui", "ui_examples"]);
    expect(config.skills).toEqual(["ui"]);
    expect(config.instructions).toBeNull();
    expect(harness.registrations.instructionProvider).toBeNull();
    for (const tool of harness.registrations.agentTools) {
      expect(tool.instructions).toBeNull();
    }
    await harness.lifecycle.dispose();
  });

  it("keeps UI tools and skills out of background agent sessions", async () => {
    const { bb, harness } = createFakePluginHost({ pluginId: "genui", agentSkillIds: ["ui"] });
    await plugin(bb);
    const config = await harness.behavior.resolveAgentConfiguration(makePluginAgentConfigurationContext({
      thread: { parentThreadId: "parent" },
      origin: { kind: "fork", pluginId: "automations" },
    }));
    expect(config.tools).toEqual([]);
    expect(config.skills).toEqual([]);
    expect(config.instructions).toBeNull();
    expect(harness.registrations.instructionProvider).toBeNull();
    await harness.lifecycle.dispose();
  });
});
