module PublicCardScoped
  extend ActiveSupport::Concern

  included do
    before_action :set_collection_and_card
  end

  private
    def set_collection_and_card
      @collection = Collection.find_by_published_key(params[:collection_id])
      @card = @collection.cards.find(params[:id])
    end
end
