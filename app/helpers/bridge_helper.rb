module BridgeHelper
  def bridge_icon(name)
    asset_url("#{name}.svg")
  end

  def bridged_button_to_board(board)
    link_to "Go to #{board.name}", board, hidden: true, data: {
      bridge__buttons_target: "button",
      bridge_icon_url: bridge_icon("board"),
      bridge_title: "Go to #{board.name}"
    }
  end

  def bridged_share_button(type = nil)
    tag.button "Share", hidden: true, data: {
      controller: "bridge--share",
      action: "bridge--share#share",
      bridge__overflow_menu_target: "item",
      bridge_title: "Share",
      bridge_share_type: type
    }
  end
end
