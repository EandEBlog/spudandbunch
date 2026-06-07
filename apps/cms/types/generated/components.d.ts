import type { Schema, Struct } from '@strapi/strapi';

export interface RecipeIngredient extends Struct.ComponentSchema {
  collectionName: 'components_recipe_ingredients';
  info: {
    description: 'A single recipe ingredient row.';
    displayName: 'Ingredient';
    icon: 'bulletList';
  };
  attributes: {
    item: Schema.Attribute.String & Schema.Attribute.Required;
    quantity: Schema.Attribute.String;
    unit: Schema.Attribute.String;
  };
}

export interface RecipeRecipeDetails extends Struct.ComponentSchema {
  collectionName: 'components_recipe_recipe_details';
  info: {
    description: 'Structured recipe fields. Present on a Post only when it is a recipe.';
    displayName: 'Recipe Details';
    icon: 'restaurant';
  };
  attributes: {
    cookTime: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    ingredients: Schema.Attribute.Component<'recipe.ingredient', true>;
    prepTime: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    servings: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    steps: Schema.Attribute.Component<'recipe.step', true>;
  };
}

export interface RecipeStep extends Struct.ComponentSchema {
  collectionName: 'components_recipe_steps';
  info: {
    description: 'A single recipe method step.';
    displayName: 'Step';
    icon: 'list';
  };
  attributes: {
    text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'recipe.ingredient': RecipeIngredient;
      'recipe.recipe-details': RecipeRecipeDetails;
      'recipe.step': RecipeStep;
    }
  }
}
