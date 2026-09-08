package solutions.onz.platform.strato.creator.configuration;

import io.mongock.runner.springboot.EnableMongock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.convert.DefaultDbRefResolver;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongock
@EnableMongoAuditing
@EnableMongoRepositories({
        "solutions.onz.platform.strato.creator.repositories",
        "solutions.onz.platform.strato.creator.provisioner.repositories",
        "solutions.onz.platform.strato.creator.forge.repositories",
        "solutions.onz.platform.strato.creator.workflow.repositories"
})
public class DatabaseConfiguration {
    // Mongock Spring Boot starter with Spring Data MongoDB v4 driver will auto-configure
    // using the application's MongoTemplate and MongoClient; no explicit ConnectionDriver bean needed.

    @Bean
    public MappingMongoConverter mappingMongoConverter(MongoDatabaseFactory factory, MongoMappingContext context, MongoCustomConversions conversions) {
        MappingMongoConverter converter = new MappingMongoConverter(new DefaultDbRefResolver(factory), context);
        converter.setCustomConversions(conversions);
        converter.setMapKeyDotReplacement("__dot__");
        return converter;
    }
}
