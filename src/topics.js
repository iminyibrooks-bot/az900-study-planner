
/**
 * topics.js
 * AZ-900 Study Planner topic data
 *
 * Each topic must have:
 * - id: unique identifier used by the planner
 * - name: topic displayed in the study plan
 * - area: the main AZ-900 knowledge area
 * - tip: optional study advice
 */

const TOPICS = [
  // AREA 1: CLOUD CONCEPTS
  {
    id: "cloud-computing",
    name: "Cloud Computing",
    area: "Cloud Concepts",
    tip: "Understand what cloud computing is and how it works.",
  },
  {
    id: "shared-responsibility",
    name: "Shared Responsibility Model",
    area: "Cloud Concepts",
    tip: "Know which responsibilities belong to the customer and the cloud provider.",
  },
  {
    id: "cloud-models",
    name: "Public, Private, and Hybrid Clouds",
    area: "Cloud Concepts",
    tip: "Compare the three cloud deployment models and their use cases.",
  },
  {
    id: "consumption-pricing",
    name: "Consumption-Based Model and Cloud Pricing",
    area: "Cloud Concepts",
    tip: "Review pay-as-you-go pricing and cloud cost models.",
  },
  {
    id: "serverless",
    name: "Serverless Computing",
    area: "Cloud Concepts",
    tip: "Understand how serverless reduces infrastructure management.",
  },
  {
    id: "cloud-benefits",
    name: "Benefits of Cloud Services",
    area: "Cloud Concepts",
    tip: "Review scalability, reliability, availability, and manageability.",
  },
  {
    id: "cloud-service-types",
    name: "IaaS, PaaS, and SaaS",
    area: "Cloud Concepts",
    tip: "Learn the differences and identify suitable use cases for each service type.",
  },

  // AREA 2: AZURE ARCHITECTURE AND SERVICES
  {
    id: "azure-regions",
    name: "Azure Regions and Availability Zones",
    area: "Azure Architecture and Services",
    tip: "Understand regions, region pairs, sovereign regions, and availability zones.",
  },
  {
    id: "azure-hierarchy",
    name: "Azure Resources, Resource Groups, and Subscriptions",
    area: "Azure Architecture and Services",
    tip: "Learn how resources, resource groups, subscriptions, and management groups relate.",
  },
  {
    id: "azure-compute",
    name: "Azure Compute Services",
    area: "Azure Architecture and Services",
    tip: "Compare virtual machines, containers, functions, and application hosting options.",
  },
  {
    id: "azure-virtual-machines",
    name: "Virtual Machines and Scaling Options",
    area: "Azure Architecture and Services",
    tip: "Review virtual machines, scale sets, availability sets, and Azure Virtual Desktop.",
  },
  {
    id: "azure-networking",
    name: "Azure Networking",
    area: "Azure Architecture and Services",
    tip: "Study virtual networks, subnets, peering, DNS, VPN Gateway, and ExpressRoute.",
  },
  {
    id: "azure-endpoints",
    name: "Public and Private Endpoints",
    area: "Azure Architecture and Services",
    tip: "Understand how public and private endpoints provide access to services.",
  },
  {
    id: "azure-storage",
    name: "Azure Storage Services and Storage Accounts",
    area: "Azure Architecture and Services",
    tip: "Compare storage services, account types, and storage types.",
  },
  {
    id: "azure-redundancy",
    name: "Storage Tiers and Redundancy",
    area: "Azure Architecture and Services",
    tip: "Compare storage tiers and redundancy options.",
  },
  {
    id: "azure-migration",
    name: "File Transfer and Migration Tools",
    area: "Azure Architecture and Services",
    tip: "Review AzCopy, Storage Explorer, Azure File Sync, Azure Migrate, and Data Box.",
  },
  {
    id: "microsoft-entra",
    name: "Microsoft Entra ID and Identity Services",
    area: "Azure Architecture and Services",
    tip: "Understand directory services, external identities, and authentication methods.",
  },
  {
    id: "azure-access-security",
    name: "Authentication, Conditional Access, and RBAC",
    area: "Azure Architecture and Services",
    tip: "Review SSO, MFA, passwordless authentication, Conditional Access, and permissions.",
  },
  {
    id: "azure-security-models",
    name: "Zero Trust, Defense in Depth, and Defender for Cloud",
    area: "Azure Architecture and Services",
    tip: "Understand security principles and the purpose of Defender for Cloud.",
  },

  // AREA 3: AZURE MANAGEMENT AND GOVERNANCE
  {
    id: "azure-costs",
    name: "Azure Costs and Pricing Calculator",
    area: "Azure Management and Governance",
    tip: "Review factors affecting costs and how to estimate spending.",
  },
  {
    id: "azure-cost-management",
    name: "Cost Management and Tags",
    area: "Azure Management and Governance",
    tip: "Understand cost management features and how tags organize resources.",
  },
  {
    id: "azure-governance",
    name: "Azure Policy, Resource Locks, and Purview",
    area: "Azure Management and Governance",
    tip: "Know how policies, locks, and Purview support governance and compliance.",
  },
  {
    id: "azure-deployment",
    name: "Azure Portal, CLI, PowerShell, and Cloud Shell",
    area: "Azure Management and Governance",
    tip: "Recognize the tools used to manage Azure resources.",
  },
  {
    id: "azure-arc-iac",
    name: "Azure Arc and Infrastructure as Code",
    area: "Azure Management and Governance",
    tip: "Review hybrid and multicloud management, ARM, and ARM templates.",
  },
  {
    id: "azure-monitoring",
    name: "Azure Monitoring and Service Health",
    area: "Azure Management and Governance",
    tip: "Compare Azure Advisor, Service Health, Azure Monitor, alerts, Log Analytics, and Application Insights.",
  },
];
//Make topics available in the broswer.
if (typeof window!== "undefined") {
  window.TOPICS = TOPICS;
}
// Make the topic list available to other JavaScript files using Node.js.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TOPICS };
}
