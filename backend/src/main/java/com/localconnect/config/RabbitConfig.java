package com.localconnect.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "rabbitmq.enabled", havingValue = "true", matchIfMissing = false)
public class RabbitConfig {


    @Bean
    public Queue webhookQueue() {
        java.util.Map<String,Object> args = new java.util.HashMap<>();
        args.put("x-dead-letter-exchange", "webhook.dlx");
        args.put("x-dead-letter-routing-key", "webhook.delivery.dlq");
        return new Queue("webhook.delivery", true, false, false, args);
    }

    @Bean
    public TopicExchange webhookExchange() {
        return new TopicExchange("webhook.exchange");
    }

    @Bean
    public Binding binding(Queue webhookQueue, TopicExchange webhookExchange) {
        return BindingBuilder.bind(webhookQueue).to(webhookExchange).with("webhook.delivery");
    }

    @Bean
    public TopicExchange webhookDeadLetterExchange() {
        return new TopicExchange("webhook.dlx");
    }

    @Bean
    public Queue webhookDeadLetterQueue() {
        return new Queue("webhook.delivery.dlq", true);
    }

    @Bean
    public Binding dlqBinding(Queue webhookDeadLetterQueue, TopicExchange webhookDeadLetterExchange) {
        return BindingBuilder.bind(webhookDeadLetterQueue).to(webhookDeadLetterExchange).with("webhook.delivery.dlq");
    }
}
