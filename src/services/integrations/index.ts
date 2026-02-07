/**
 * FlowForge Integrations Services
 */

export { ConnectorService, connectorService } from './connector.service';
export { WebhookService, webhookService } from './webhook.service';
export { 
  connectorTemplates, 
  listTemplates, 
  getTemplate,
  salesforceTemplate,
  googleTemplate,
  microsoftTemplate,
  slackTemplate,
  restTemplate,
} from './connector-templates';
