import {useEffect, useState} from 'react';
import * as d3 from 'd3';

export interface TimelineEntry {
    environmentName: string;
    version: string;
    deployedAt: string;
    commitId?: string;
    author?: string;
}

interface DeploymentTimelineD3Props {
    entries: TimelineEntry[];
    width?: number;
    height?: number;
    latestVersion: string;
    allVersions: string[];
}

const DeploymentTimelineD3 = ({
    entries,
    width = 700,
    height = 220,
    latestVersion,
    allVersions
}: DeploymentTimelineD3Props) => {
    const [svgNode, setSvgNode] = useState<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgNode || !entries || entries.length === 0) return;

        const svg = d3.select(svgNode);
        svg.selectAll("*").remove();

        const margin = {top: 30, right: 30, bottom: 35, left: 90};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Compute time domain
        const times = entries.map(e => new Date(e.deployedAt).getTime());
        const now = Date.now();
        const minTime = Math.min(...times);
        const timeExtent: [Date, Date] = [
            new Date(Math.min(minTime, now - 7 * 24 * 60 * 60 * 1000)),
            new Date(now + (now - minTime) * 0.05)
        ];

        const xScale = d3.scaleTime()
            .domain(timeExtent)
            .range([0, innerW]);

        // Environments on Y axis
        const envNames = [...new Set(entries.map(e => e.environmentName))];
        const yScale = d3.scaleBand()
            .domain(envNames)
            .range([0, innerH])
            .padding(0.3);

        // Version staleness color
        const getColor = (version: string): string => {
            if (version === latestVersion) return 'var(--green-9)';
            const latestIdx = allVersions.indexOf(latestVersion);
            const currentIdx = allVersions.indexOf(version);
            if (latestIdx === -1 || currentIdx === -1) return 'var(--gray-9)';
            const drift = latestIdx - currentIdx;
            if (drift <= 1) return 'var(--amber-9)';
            return 'var(--crimson-9)';
        };

        // X axis
        const xAxis = d3.axisBottom(xScale)
            .ticks(6)
            .tickFormat((d) => {
                const diff = now - (d as Date).getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const days = Math.floor(hours / 24);
                if (days > 0) return `${days}d ago`;
                if (hours > 0) return `${hours}h ago`;
                return 'now';
            });

        g.append("g")
            .attr("transform", `translate(0,${innerH})`)
            .call(xAxis)
            .selectAll("text")
            .attr("fill", "var(--gray-11)")
            .attr("font-size", "11px");

        g.selectAll(".domain, .tick line")
            .attr("stroke", "var(--gray-6)");

        // Y axis
        g.append("g")
            .call(d3.axisLeft(yScale))
            .selectAll("text")
            .attr("fill", "var(--gray-11)")
            .attr("font-size", "11px")
            .attr("font-weight", "500");

        g.selectAll(".domain, .tick line").attr("stroke", "var(--gray-6)");

        // Horizontal grid lines
        g.selectAll(".grid-line")
            .data(envNames)
            .join("line")
            .attr("class", "grid-line")
            .attr("x1", 0)
            .attr("x2", innerW)
            .attr("y1", d => (yScale(d) ?? 0) + yScale.bandwidth() / 2)
            .attr("y2", d => (yScale(d) ?? 0) + yScale.bandwidth() / 2)
            .attr("stroke", "var(--gray-4)")
            .attr("stroke-dasharray", "3,3");

        // Promotion path: connect same-version deployments across environments
        const versionGroups = d3.group(entries, e => e.version);
        versionGroups.forEach((group) => {
            if (group.length < 2) return;
            const sorted = [...group].sort((a, b) =>
                new Date(a.deployedAt).getTime() - new Date(b.deployedAt).getTime()
            );
            for (let i = 0; i < sorted.length - 1; i++) {
                const from = sorted[i];
                const to = sorted[i + 1];
                const x1 = xScale(new Date(from.deployedAt));
                const y1 = (yScale(from.environmentName) ?? 0) + yScale.bandwidth() / 2;
                const x2 = xScale(new Date(to.deployedAt));
                const y2 = (yScale(to.environmentName) ?? 0) + yScale.bandwidth() / 2;

                g.append("line")
                    .attr("x1", x1)
                    .attr("y1", y1)
                    .attr("x2", x2)
                    .attr("y2", y2)
                    .attr("stroke", getColor(from.version))
                    .attr("stroke-width", 1.5)
                    .attr("stroke-opacity", 0.4)
                    .attr("stroke-dasharray", "4,3");
            }
        });

        // Tooltip div
        let tooltip = d3.select("#deployment-timeline-tooltip");
        if (tooltip.empty()) {
            tooltip = d3.select("body").append("div")
                .attr("id", "deployment-timeline-tooltip")
                .style("position", "fixed")
                .style("pointer-events", "none")
                .style("background", "var(--color-panel-solid)")
                .style("border", "1px solid var(--gray-6)")
                .style("border-radius", "6px")
                .style("padding", "8px 12px")
                .style("font-size", "12px")
                .style("color", "var(--gray-12)")
                .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)")
                .style("z-index", "9999")
                .style("display", "none") as any;
        }

        // Markers
        g.selectAll(".marker")
            .data(entries)
            .join("circle")
            .attr("class", "marker")
            .attr("cx", d => xScale(new Date(d.deployedAt)))
            .attr("cy", d => (yScale(d.environmentName) ?? 0) + yScale.bandwidth() / 2)
            .attr("r", 7)
            .attr("fill", d => getColor(d.version))
            .attr("stroke", "var(--color-panel-solid)")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("mouseenter", (_event: any, d) => {
                const commitStr = d.commitId ? d.commitId.substring(0, 7) : '—';
                const authorStr = d.author || '—';
                const timeStr = new Date(d.deployedAt).toLocaleString();
                tooltip
                    .style("display", "block")
                    .html(`
                        <div style="font-weight:600;margin-bottom:4px">${d.environmentName}</div>
                        <div><span style="color:var(--gray-9)">Version:</span> <strong>${d.version}</strong></div>
                        <div><span style="color:var(--gray-9)">Commit:</span> <code>${commitStr}</code></div>
                        <div><span style="color:var(--gray-9)">Author:</span> ${authorStr}</div>
                        <div><span style="color:var(--gray-9)">Time:</span> ${timeStr}</div>
                    `);
            })
            .on("mousemove", (event) => {
                tooltip
                    .style("left", (event.clientX + 12) + "px")
                    .style("top", (event.clientY - 10) + "px");
            })
            .on("mouseleave", () => {
                tooltip.style("display", "none");
            });

        // Version labels next to markers
        g.selectAll(".version-label")
            .data(entries)
            .join("text")
            .attr("class", "version-label")
            .attr("x", d => xScale(new Date(d.deployedAt)))
            .attr("y", d => (yScale(d.environmentName) ?? 0) + yScale.bandwidth() / 2 - 12)
            .attr("text-anchor", "middle")
            .attr("fill", "var(--gray-11)")
            .attr("font-size", "9px")
            .attr("font-weight", "500")
            .text(d => d.version);

        // Cleanup tooltip on unmount
        return () => {
            tooltip.style("display", "none");
        };
    }, [entries, svgNode, width, height, latestVersion, allVersions]);

    if (!entries || entries.length === 0) {
        return null;
    }

    return (
        <svg
            ref={setSvgNode}
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            style={{display: 'block'}}
        />
    );
};

export default DeploymentTimelineD3;
